import {
  clearPausedGame,
  createEmptyGameData,
  parseGameData,
  pauseGame,
  recordOutcome,
  resetScores,
} from "../storage/model.js";
import type { GameData } from "../storage/model.js";
import type { GameStorage } from "./gameStorage.js";

export const STORAGE_KEY = "tic-tac-toe:game-data";
const CORRUPT_KEY = `${STORAGE_KEY}:corrupt`;

export function createLocalStorageClient(storage: Storage): GameStorage {
  function read(): GameData {
    const text = storage.getItem(STORAGE_KEY);
    if (text === null) return createEmptyGameData();

    try {
      return parseGameData(JSON.parse(text));
    } catch {
      // Keep the unreadable value for inspection, then start fresh.
      try {
        storage.setItem(CORRUPT_KEY, text);
        storage.removeItem(STORAGE_KEY);
      } catch {
        // Storage is not writable; the next write reports the problem.
      }
      return createEmptyGameData();
    }
  }

  // Always applied to the latest stored value so another open tab's changes are not overwritten.
  async function update(change: (data: GameData) => GameData): Promise<GameData> {
    const next = change(read());
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  return {
    loadState: async () => read(),
    finish: (outcome) => update((data) => recordOutcome(data, outcome)),
    pause: (state, mode, difficulty) => update((data) => pauseGame(data, state, mode, difficulty)),
    discardPaused: () => update(clearPausedGame),
    resetScores: () => update(resetScores),
  };
}

// Returns null when localStorage is blocked or unusable (for example some private modes).
export function getBrowserStorage(): Storage | null {
  try {
    const probe = `${STORAGE_KEY}:probe`;
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}
