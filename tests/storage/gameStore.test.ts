import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGame, makeMove } from "../../src/game.js";
import { createGameStore } from "../../src/storage/gameStore.js";
import type { GameStore } from "../../src/storage/gameStore.js";
import { createEmptyGameData } from "../../src/storage/model.js";

let dir: string;
let file: string;
let store: GameStore;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "ttt-store-"));
  file = join(dir, "nested", "game-data.json");
  store = createGameStore(file);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(dir, { recursive: true, force: true });
});

const midGame = makeMove(makeMove(createGame(), 0), 4);

describe("createGameStore", () => {
  it("returns empty data when the file does not exist", async () => {
    expect(await store.load()).toEqual(createEmptyGameData());
  });

  it("keeps a paused game across store instances", async () => {
    await store.pauseGame(midGame, "computer", "hard");
    const reloaded = await createGameStore(file).load();
    expect(reloaded.pausedGame?.state).toEqual(midGame);
    expect(reloaded.pausedGame?.mode).toBe("computer");
    expect(reloaded.pausedGame?.difficulty).toBe("hard");
  });

  it("records a finished game and clears the paused game in one step", async () => {
    await store.pauseGame(midGame, "two-players", "medium");
    const data = await store.finishGame("player2-win");
    expect(data.scores.player2Wins).toBe(1);
    expect(data.pausedGame).toBeNull();
    expect((await createGameStore(file).load()).scores.player2Wins).toBe(1);
  });

  it("discards a paused game without touching the scores", async () => {
    await store.finishGame("draw");
    await store.pauseGame(midGame, "computer", "easy");
    const data = await store.discardPausedGame();
    expect(data.pausedGame).toBeNull();
    expect(data.scores.draws).toBe(1);
  });

  it("resets the scores but keeps the paused game", async () => {
    await store.finishGame("draw");
    await store.pauseGame(midGame, "two-players", "medium");
    const data = await store.resetScores();
    expect(data.scores).toEqual({ player1Wins: 0, player2Wins: 0, draws: 0 });
    expect(data.pausedGame).not.toBeNull();
  });

  it("rejects pausing a finished game", async () => {
    const won = [0, 3, 1, 4, 2].reduce(makeMove, createGame());
    await expect(store.pauseGame(won, "two-players", "medium")).rejects.toThrow();
  });

  it("does not lose concurrent updates", async () => {
    await Promise.all(Array.from({ length: 20 }, () => store.finishGame("player1-win")));
    expect((await store.load()).scores.player1Wins).toBe(20);
  });

  it("leaves no temporary file behind", async () => {
    await store.finishGame("draw");
    expect(await readdir(join(dir, "nested"))).toEqual(["game-data.json"]);
  });

  it("moves a corrupt file aside and starts fresh", async () => {
    await store.finishGame("draw");
    await writeFile(file, "{ not json", "utf8");
    vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(await store.load()).toEqual(createEmptyGameData());
    const files = await readdir(join(dir, "nested"));
    expect(files.some((name) => name.startsWith("game-data.json.corrupt-"))).toBe(true);
    expect(files).not.toContain("game-data.json");
  });

  it("keeps the scores when only the paused game is invalid", async () => {
    await store.finishGame("draw");
    const data = JSON.parse(await readFile(file, "utf8")) as Record<string, unknown>;
    await writeFile(file, JSON.stringify({ ...data, pausedGame: { state: "bad" } }), "utf8");

    const loaded = await store.load();
    expect(loaded.scores.draws).toBe(1);
    expect(loaded.pausedGame).toBeNull();
  });
});
