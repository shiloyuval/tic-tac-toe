import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { GameState } from "../game.js";
import type { GameMode } from "../mode.js";
import * as model from "./model.js";
import type { GameData, Outcome } from "./model.js";

export interface GameStore {
  load(): Promise<GameData>;
  finishGame(outcome: Outcome): Promise<GameData>;
  pauseGame(state: GameState, mode: GameMode): Promise<GameData>;
  discardPausedGame(): Promise<GameData>;
  resetScores(): Promise<GameData>;
}

export function defaultDataFile(): string {
  return resolve(process.env.GAME_DATA_FILE ?? "data/game-data.json");
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

export function createGameStore(filePath: string = defaultDataFile()): GameStore {
  // Operations run one at a time so a read-modify-write can never lose an update.
  let queue: Promise<unknown> = Promise.resolve();
  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = queue.then(operation);
    queue = result.catch(() => undefined);
    return result;
  }

  async function readData(): Promise<GameData> {
    let text: string;
    try {
      text = await readFile(filePath, "utf8");
    } catch (error) {
      if (isMissingFile(error)) return model.createEmptyGameData();
      throw error;
    }

    try {
      return model.parseGameData(JSON.parse(text));
    } catch {
      const backup = `${filePath}.corrupt-${Date.now()}`;
      await rename(filePath, backup);
      console.warn(`Game data file was invalid. It was moved to ${backup}; starting fresh.`);
      return model.createEmptyGameData();
    }
  }

  // Write to a temporary file first so a crash cannot leave a half-written data file.
  async function writeData(data: GameData): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    const temporary = `${filePath}.${process.pid}.tmp`;
    await writeFile(temporary, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    await rename(temporary, filePath);
  }

  function update(change: (data: GameData) => GameData): Promise<GameData> {
    return enqueue(async () => {
      const next = change(await readData());
      await writeData(next);
      return next;
    });
  }

  return {
    load: () => enqueue(readData),
    finishGame: (outcome) => update((data) => model.recordOutcome(data, outcome)),
    pauseGame: (state, mode) => update((data) => model.pauseGame(data, state, mode)),
    discardPausedGame: () => update(model.clearPausedGame),
    resetScores: () => update(model.resetScores),
  };
}
