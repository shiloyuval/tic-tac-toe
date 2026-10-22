import type { GameState } from "../game.js";
import type { GameMode } from "../mode.js";
import { parseGameData } from "../storage/model.js";
import type { GameData, Outcome } from "../storage/model.js";

export interface ApiClient {
  loadState(): Promise<GameData>;
  finish(outcome: Outcome): Promise<GameData>;
  pause(state: GameState, mode: GameMode): Promise<GameData>;
  discardPaused(): Promise<GameData>;
  resetScores(): Promise<GameData>;
}

export function createApiClient(baseUrl = ""): ApiClient {
  async function request(method: string, path: string, body?: unknown): Promise<GameData> {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Request failed with status ${response.status}.`);
    return parseGameData(await response.json());
  }

  return {
    loadState: () => request("GET", "/api/state"),
    finish: (outcome) => request("POST", "/api/finish", { outcome }),
    pause: (state, mode) => request("PUT", "/api/paused-game", { state, mode }),
    discardPaused: () => request("DELETE", "/api/paused-game"),
    resetScores: () => request("DELETE", "/api/scores"),
  };
}
