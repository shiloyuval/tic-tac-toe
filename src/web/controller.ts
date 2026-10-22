import { chooseComputerMove } from "../computer.js";
import { createGame, getGameResult, makeMove } from "../game.js";
import type { GameState } from "../game.js";
import { COMPUTER_PLAYER } from "../mode.js";
import type { GameMode } from "../mode.js";
import { outcomeOf, shouldRecord } from "../storage/model.js";
import type { GameData, Scores } from "../storage/model.js";
import type { ApiClient } from "./apiClient.js";

export type Persistence = "loading" | "available" | "unavailable";

export interface ViewModel {
  state: GameState;
  mode: GameMode;
  message: string;
  locked: boolean;
  scores: Scores | null;
  persistence: Persistence;
  paused: boolean;
  canPause: boolean;
  hasSavedGame: boolean;
}

export interface Controller {
  getViewModel(): ViewModel;
  init(): Promise<void>;
  playerMove(position: number): void;
  setMode(mode: GameMode): void;
  reset(): void;
  pause(): Promise<void>;
  resume(): void;
  resetScores(): Promise<void>;
  idle(): Promise<void>;
}

export interface ControllerOptions {
  api: ApiClient | null;
  onChange: () => void;
  delayMs?: number;
}

export const COMPUTER_DELAY_MS = 400;

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createController({
  api,
  onChange,
  delayMs = COMPUTER_DELAY_MS,
}: ControllerOptions): Controller {
  let state = createGame();
  let mode: GameMode = "two-players";
  let error = "";
  let thinking = false;
  let generation = 0;
  let paused = false;
  let hasSavedGame = false;
  let scores: Scores | null = null;
  let persistence: Persistence = api === null ? "unavailable" : "loading";

  // Storage calls run in order so a quick pause followed by resume cannot reach the server reversed.
  let queue: Promise<unknown> = Promise.resolve();
  function persist<T>(operation: (client: ApiClient) => Promise<T>): Promise<T> {
    if (api === null) return Promise.reject(new Error("Storage is unavailable."));
    const client = api;
    const result = queue.then(() => operation(client));
    queue = result.catch(() => undefined);
    return result;
  }

  const isComputerTurn = (): boolean =>
    mode === "computer" && state.status === "in-progress" && state.currentPlayer === COMPUTER_PLAYER;

  function applyData(data: GameData): void {
    scores = data.scores;
    persistence = "available";
  }

  function discardSavedGame(): void {
    if (!hasSavedGame) return;
    hasSavedGame = false;
    persist((client) => client.discardPaused())
      .then(applyData)
      .catch((cause: unknown) => {
        error = `Could not remove the saved game: ${describeError(cause)}`;
      })
      .finally(onChange);
  }

  function onGameFinished(): void {
    const outcome = outcomeOf(state);
    if (outcome !== null && shouldRecord(mode)) {
      hasSavedGame = false;
      persist((client) => client.finish(outcome))
        .then(applyData)
        .catch(() => {
          persistence = "unavailable";
        })
        .finally(onChange);
      return;
    }
    discardSavedGame();
  }

  function scheduleComputerMove(): void {
    thinking = true;
    const current = generation;
    setTimeout(() => {
      if (current !== generation) return;
      thinking = false;
      state = makeMove(state, chooseComputerMove(state));
      if (state.status !== "in-progress") onGameFinished();
      onChange();
    }, delayMs);
  }

  function restart(): void {
    generation++;
    thinking = false;
    paused = false;
    error = "";
    state = createGame();
    discardSavedGame();
    onChange();
  }

  return {
    getViewModel: () => ({
      state,
      mode,
      message: paused ? "Game paused. Press Resume to continue." : error || getGameResult(state),
      locked: thinking || paused || persistence === "loading" || state.status !== "in-progress",
      scores,
      persistence,
      paused,
      canPause: persistence === "available" && state.status === "in-progress" && !paused,
      hasSavedGame,
    }),

    async init() {
      if (api === null) {
        onChange();
        return;
      }
      try {
        const data = await persist((client) => client.loadState());
        applyData(data);
        if (data.pausedGame !== null) {
          state = data.pausedGame.state;
          mode = data.pausedGame.mode;
          paused = true;
          hasSavedGame = true;
        }
      } catch {
        persistence = "unavailable";
      }
      onChange();
    },

    playerMove(position) {
      if (thinking || paused || isComputerTurn()) return;
      try {
        state = makeMove(state, position);
        error = "";
      } catch (cause) {
        error = describeError(cause);
        onChange();
        return;
      }
      if (state.status !== "in-progress") onGameFinished();
      else if (isComputerTurn()) scheduleComputerMove();
      onChange();
    },

    setMode(next) {
      mode = next;
      restart();
    },

    reset: restart,

    async pause() {
      if (persistence !== "available" || state.status !== "in-progress" || paused) return;
      generation++;
      thinking = false;
      paused = true;
      hasSavedGame = true;
      error = "";
      onChange();

      try {
        applyData(await persist((client) => client.pause(state, mode)));
      } catch (cause) {
        error = `Could not save the paused game: ${describeError(cause)}`;
        if (paused) {
          paused = false;
          hasSavedGame = false;
          if (isComputerTurn()) scheduleComputerMove();
        }
      }
      onChange();
    },

    resume() {
      if (!paused) return;
      paused = false;
      error = "";
      discardSavedGame();
      if (isComputerTurn()) scheduleComputerMove();
      onChange();
    },

    async resetScores() {
      try {
        applyData(await persist((client) => client.resetScores()));
      } catch (cause) {
        error = `Could not reset the scores: ${describeError(cause)}`;
      }
      onChange();
    },

    idle: () => queue.then(() => undefined),
  };
}
