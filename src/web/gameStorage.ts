import type { GameState } from "../game.js";
import type { Difficulty, GameMode } from "../mode.js";
import type { GameData, Outcome } from "../storage/model.js";

// Where the web game keeps its scores and paused game: the HTTP API or the browser's localStorage.
export interface GameStorage {
  loadState(): Promise<GameData>;
  finish(outcome: Outcome): Promise<GameData>;
  pause(state: GameState, mode: GameMode, difficulty: Difficulty): Promise<GameData>;
  discardPaused(): Promise<GameData>;
  resetScores(): Promise<GameData>;
}
