import { parseGameData } from "../storage/model.js";
import type { GameData } from "../storage/model.js";
import type { GameStorage } from "./gameStorage.js";

export function createApiClient(baseUrl = ""): GameStorage {
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
    pause: (state, mode, difficulty) => request("PUT", "/api/paused-game", { state, mode, difficulty }),
    discardPaused: () => request("DELETE", "/api/paused-game"),
    resetScores: () => request("DELETE", "/api/scores"),
  };
}
