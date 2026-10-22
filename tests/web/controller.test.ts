import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getWinningLine } from "../../src/game.js";
import type { Board, GameState } from "../../src/game.js";
import type { GameMode } from "../../src/mode.js";
import { createEmptyGameData, pauseGame, recordOutcome } from "../../src/storage/model.js";
import type { GameData, Outcome } from "../../src/storage/model.js";
import type { GameStorage } from "../../src/web/gameStorage.js";
import { createController } from "../../src/web/controller.js";
import type { Controller } from "../../src/web/controller.js";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

interface FakeApi extends GameStorage {
  data: GameData;
  calls: string[];
  failing: boolean;
}

function createFakeApi(initial: GameData = createEmptyGameData()): FakeApi {
  const api: FakeApi = {
    data: initial,
    calls: [],
    failing: false,
    async loadState() {
      return call("loadState", () => api.data);
    },
    async finish(outcome: Outcome) {
      return call("finish", () => (api.data = recordOutcome(api.data, outcome)));
    },
    async pause(state: GameState, mode: GameMode) {
      return call("pause", () => (api.data = pauseGame(api.data, state, mode)));
    },
    async discardPaused() {
      return call("discardPaused", () => (api.data = { ...api.data, pausedGame: null }));
    },
    async resetScores() {
      return call("resetScores", () => (api.data = createEmptyGameData()));
    },
  };

  function call(name: string, run: () => GameData): GameData {
    api.calls.push(name);
    if (api.failing) throw new Error("offline");
    return run();
  }
  return api;
}

async function startController(api: FakeApi | null, delayMs = 100): Promise<Controller> {
  const controller = createController({ storage: api, onChange: () => {}, delayMs });
  await controller.init();
  return controller;
}

function playMoves(controller: Controller, positions: number[]): void {
  positions.forEach((position) => controller.playerMove(position));
}

const X_WINS = [0, 3, 1, 4, 2];
const DRAW = [0, 1, 2, 4, 3, 5, 7, 6, 8];

describe("getWinningLine", () => {
  it("returns the winning combination or null", () => {
    const won: Board = ["X", "X", "X", "O", "O", null, null, null, null];
    expect(getWinningLine(won)).toEqual([0, 1, 2]);
    const open: Board = ["X", "O", null, null, null, null, null, null, null];
    expect(getWinningLine(open)).toBeNull();
  });
});

describe("web controller (two players)", () => {
  it("places a symbol and switches turn", async () => {
    const c = await startController(null);
    c.playerMove(4);
    const vm = c.getViewModel();
    expect(vm.state.board[4]).toBe("X");
    expect(vm.state.currentPlayer).toBe("O");
  });

  it("reports an occupied cell without changing state", async () => {
    const c = await startController(null);
    c.playerMove(0);
    c.playerMove(0);
    const vm = c.getViewModel();
    expect(vm.message).toMatch(/occupied/);
    expect(vm.state.currentPlayer).toBe("O");
  });

  it("locks the board after a win", async () => {
    const c = await startController(null);
    playMoves(c, X_WINS);
    const vm = c.getViewModel();
    expect(vm.state.winner).toBe("X");
    expect(vm.locked).toBe(true);
    c.playerMove(8);
    expect(c.getViewModel().state.board[8]).toBeNull();
  });

  it("reset starts a fresh game", async () => {
    const c = await startController(null);
    c.playerMove(0);
    c.reset();
    expect(c.getViewModel().state.board.every((cell) => cell === null)).toBe(true);
  });
});

describe("web controller (vs computer)", () => {
  it("replies as O after a delay and blocks input meanwhile", async () => {
    const c = await startController(null);
    c.setMode("computer");
    c.playerMove(0);
    expect(c.getViewModel().locked).toBe(true);
    c.playerMove(8);
    expect(c.getViewModel().state.board[8]).toBeNull();

    vi.advanceTimersByTime(100);
    const vm = c.getViewModel();
    expect(vm.state.board.filter((cell) => cell === "O")).toHaveLength(1);
    expect(vm.locked).toBe(false);
  });

  it("changing mode cancels a pending computer move", async () => {
    const c = await startController(null);
    c.setMode("computer");
    c.playerMove(0);
    c.setMode("two-players");
    vi.advanceTimersByTime(200);
    expect(c.getViewModel().state.board.every((cell) => cell === null)).toBe(true);
  });

  it("can lose to a human who plays a winning line", async () => {
    const c = await startController(null, 1);
    c.setMode("computer");
    c.playerMove(4);
    vi.advanceTimersByTime(1);
    c.playerMove(2);
    vi.advanceTimersByTime(1);
    c.playerMove(6);

    expect(c.getViewModel().state.status).toBe("won");
    expect(c.getViewModel().state.winner).toBe("X");
  });
});

describe("web controller (scores)", () => {
  it("loads the scores at startup", async () => {
    const api = createFakeApi(recordOutcome(createEmptyGameData(), "player2-win"));
    const c = await startController(api);
    const vm = c.getViewModel();
    expect(vm.persistence).toBe("available");
    expect(vm.scores?.player2Wins).toBe(1);
  });

  it("records a two-player win exactly once", async () => {
    const api = createFakeApi();
    const c = await startController(api);
    playMoves(c, X_WINS);
    c.playerMove(8);
    await c.idle();
    expect(api.calls.filter((name) => name === "finish")).toHaveLength(1);
    expect(c.getViewModel().scores?.player1Wins).toBe(1);
  });

  it("records a draw", async () => {
    const api = createFakeApi();
    const c = await startController(api);
    playMoves(c, DRAW);
    await c.idle();
    expect(c.getViewModel().scores?.draws).toBe(1);
  });

  it("does not record unfinished or reset games", async () => {
    const api = createFakeApi();
    const c = await startController(api);
    playMoves(c, [0, 4]);
    c.reset();
    await c.idle();
    expect(api.calls).not.toContain("finish");
  });

  it("never records games against the computer", async () => {
    const api = createFakeApi();
    const c = await startController(api, 1);
    c.setMode("computer");
    while (c.getViewModel().state.status === "in-progress") {
      const empty = c.getViewModel().state.board.flatMap((cell, i) => (cell === null ? [i] : []));
      c.playerMove(empty[0] as number);
      vi.advanceTimersByTime(1);
    }
    await c.idle();
    expect(api.calls).not.toContain("finish");
    expect(c.getViewModel().scores).toEqual({ player1Wins: 0, player2Wins: 0, draws: 0 });
  });

  it("resets the scores", async () => {
    const api = createFakeApi(recordOutcome(createEmptyGameData(), "draw"));
    const c = await startController(api);
    await c.resetScores();
    expect(c.getViewModel().scores?.draws).toBe(0);
  });

  it("stays playable when the API is unavailable", async () => {
    const api = createFakeApi();
    api.failing = true;
    const c = await startController(api);
    expect(c.getViewModel().persistence).toBe("unavailable");
    expect(c.getViewModel().canPause).toBe(false);

    playMoves(c, X_WINS);
    await c.idle();
    expect(c.getViewModel().state.winner).toBe("X");
  });

  it("blocks moves while loading", () => {
    const api = createFakeApi();
    const c = createController({ storage: api, onChange: () => {} });
    expect(c.getViewModel().locked).toBe(true);
  });
});

describe("web controller (pause and resume)", () => {
  it("saves a paused game and locks the board", async () => {
    const api = createFakeApi();
    const c = await startController(api);
    playMoves(c, [0, 4]);
    await c.pause();

    const vm = c.getViewModel();
    expect(vm.paused).toBe(true);
    expect(vm.locked).toBe(true);
    expect(vm.message).toMatch(/paused/i);
    expect(api.data.pausedGame?.state.board[0]).toBe("X");

    c.playerMove(8);
    expect(c.getViewModel().state.board[8]).toBeNull();
  });

  it("loads a paused game at startup in the paused state", async () => {
    const api = createFakeApi();
    const first = await startController(api);
    playMoves(first, [0, 4, 8]);
    await first.pause();

    const second = await startController(api);
    const vm = second.getViewModel();
    expect(vm.paused).toBe(true);
    expect(vm.state.board[8]).toBe("X");
    expect(vm.state.currentPlayer).toBe("O");
    expect(vm.hasSavedGame).toBe(true);
  });

  it("resumes the game and removes the saved copy", async () => {
    const api = createFakeApi();
    const c = await startController(api);
    playMoves(c, [0, 4]);
    await c.pause();
    c.resume();
    await c.idle();

    expect(c.getViewModel().paused).toBe(false);
    expect(api.data.pausedGame).toBeNull();
    c.playerMove(8);
    expect(c.getViewModel().state.board[8]).toBe("X");
  });

  it("cancels a pending computer move on pause and replays it on resume", async () => {
    const api = createFakeApi();
    const c = await startController(api);
    c.setMode("computer");
    await c.idle();
    c.playerMove(0);
    await c.pause();

    vi.advanceTimersByTime(500);
    expect(c.getViewModel().state.board.filter((cell) => cell === "O")).toHaveLength(0);
    expect(api.data.pausedGame?.mode).toBe("computer");

    c.resume();
    vi.advanceTimersByTime(100);
    expect(c.getViewModel().state.board.filter((cell) => cell === "O")).toHaveLength(1);
  });

  it("keeps a paused vs-computer game unscored when it finishes", async () => {
    const api = createFakeApi();
    const first = await startController(api, 1);
    first.setMode("computer");
    first.playerMove(0);
    vi.advanceTimersByTime(1);
    await first.pause();

    const second = await startController(api, 1);
    expect(second.getViewModel().mode).toBe("computer");
    second.resume();
    while (second.getViewModel().state.status === "in-progress") {
      const empty = second.getViewModel().state.board.flatMap((cell, i) => (cell === null ? [i] : []));
      second.playerMove(empty[0] as number);
      vi.advanceTimersByTime(1);
    }
    await second.idle();
    expect(api.calls).not.toContain("finish");
  });

  it("cannot pause a finished game or without storage", async () => {
    const api = createFakeApi();
    const c = await startController(api);
    playMoves(c, X_WINS);
    await c.pause();
    expect(c.getViewModel().paused).toBe(false);
    expect(api.calls).not.toContain("pause");

    const offline = await startController(null);
    offline.playerMove(0);
    await offline.pause();
    expect(offline.getViewModel().paused).toBe(false);
  });

  it("stays in the game when saving fails", async () => {
    const api = createFakeApi();
    const c = await startController(api);
    playMoves(c, [0, 4]);
    api.failing = true;
    await c.pause();

    const vm = c.getViewModel();
    expect(vm.paused).toBe(false);
    expect(vm.message).toMatch(/Could not save/);
    expect(vm.locked).toBe(false);
  });

  it("discards the saved game when a new game starts", async () => {
    const api = createFakeApi();
    const c = await startController(api);
    playMoves(c, [0, 4]);
    await c.pause();
    c.reset();
    await c.idle();

    expect(api.data.pausedGame).toBeNull();
    expect(c.getViewModel().paused).toBe(false);
    expect(c.getViewModel().state.board.every((cell) => cell === null)).toBe(true);
  });

  it("keeps request order for a quick pause then resume", async () => {
    const api = createFakeApi();
    const c = await startController(api);
    playMoves(c, [0, 4]);
    const pausing = c.pause();
    c.resume();
    await pausing;
    await c.idle();

    expect(api.data.pausedGame).toBeNull();
    expect(api.calls.slice(-2)).toEqual(["pause", "discardPaused"]);
  });
});
