import { beforeEach, describe, expect, it } from "vitest";
import { createGame, makeMove } from "../../src/game.js";
import { createEmptyGameData } from "../../src/storage/model.js";
import {
  STORAGE_KEY,
  createLocalStorageClient,
  getBrowserStorage,
} from "../../src/web/localStorageClient.js";

class FakeStorage implements Storage {
  private items = new Map<string, string>();
  failWrites = false;

  get length(): number {
    return this.items.size;
  }
  clear(): void {
    this.items.clear();
  }
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.items.delete(key);
  }
  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error("QuotaExceededError");
    this.items.set(key, value);
  }
}

const midGame = makeMove(makeMove(createGame(), 0), 4);

let storage: FakeStorage;

beforeEach(() => {
  storage = new FakeStorage();
});

describe("createLocalStorageClient", () => {
  it("returns empty data when nothing is stored", async () => {
    expect(await createLocalStorageClient(storage).loadState()).toEqual(createEmptyGameData());
  });

  it("keeps a paused game for a new client on the same storage", async () => {
    await createLocalStorageClient(storage).pause(midGame, "two-players");
    const loaded = await createLocalStorageClient(storage).loadState();
    expect(loaded.pausedGame?.state).toEqual(midGame);
    expect(loaded.pausedGame?.mode).toBe("two-players");
  });

  it("records a finished game and clears the paused game together", async () => {
    const client = createLocalStorageClient(storage);
    await client.pause(midGame, "two-players");
    const data = await client.finish("player1-win");
    expect(data.scores.player1Wins).toBe(1);
    expect(data.pausedGame).toBeNull();
    expect((await client.loadState()).scores.player1Wins).toBe(1);
  });

  it("discards a paused game without touching the scores", async () => {
    const client = createLocalStorageClient(storage);
    await client.finish("draw");
    await client.pause(midGame, "computer");
    const data = await client.discardPaused();
    expect(data.pausedGame).toBeNull();
    expect(data.scores.draws).toBe(1);
  });

  it("resets the scores but keeps the paused game", async () => {
    const client = createLocalStorageClient(storage);
    await client.finish("player2-win");
    await client.pause(midGame, "two-players");
    const data = await client.resetScores();
    expect(data.scores).toEqual({ player1Wins: 0, player2Wins: 0, draws: 0 });
    expect(data.pausedGame).not.toBeNull();
  });

  it("rejects pausing a finished game", async () => {
    const won = [0, 3, 1, 4, 2].reduce(makeMove, createGame());
    await expect(createLocalStorageClient(storage).pause(won, "two-players")).rejects.toThrow();
  });

  it("starts fresh and keeps a copy when the stored value is corrupt", async () => {
    storage.setItem(STORAGE_KEY, "{ not json");
    const data = await createLocalStorageClient(storage).loadState();
    expect(data).toEqual(createEmptyGameData());
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
    expect(storage.getItem(`${STORAGE_KEY}:corrupt`)).toBe("{ not json");
  });

  it("keeps the scores when only the paused game is invalid", async () => {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...createEmptyGameData(), scores: { player1Wins: 2, player2Wins: 0, draws: 0 }, pausedGame: { state: "bad" } })
    );
    const data = await createLocalStorageClient(storage).loadState();
    expect(data.scores.player1Wins).toBe(2);
    expect(data.pausedGame).toBeNull();
  });

  it("rejects when the storage cannot be written", async () => {
    storage.failWrites = true;
    await expect(createLocalStorageClient(storage).finish("draw")).rejects.toThrow();
  });

  it("does not overwrite changes made by another client (another tab)", async () => {
    const tabA = createLocalStorageClient(storage);
    const tabB = createLocalStorageClient(storage);
    await tabA.finish("player1-win");
    await tabB.finish("player1-win");
    expect((await tabA.loadState()).scores.player1Wins).toBe(2);
  });
});

describe("getBrowserStorage", () => {
  it("returns null when localStorage is not available", () => {
    expect(getBrowserStorage()).toBeNull();
  });
});
