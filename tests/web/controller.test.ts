import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createController } from "../../src/web/controller.js";
import { getWinningLine } from "../../src/game.js";
import type { Board } from "../../src/game.js";

describe("getWinningLine", () => {
  it("returns the winning combination or null", () => {
    const won: Board = ["X", "X", "X", "O", "O", null, null, null, null];
    expect(getWinningLine(won)).toEqual([0, 1, 2]);
    const open: Board = ["X", "O", null, null, null, null, null, null, null];
    expect(getWinningLine(open)).toBeNull();
  });
});

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("web controller (two players)", () => {
  it("places a symbol and switches turn", () => {
    const c = createController(() => {});
    c.playerMove(4);
    const vm = c.getViewModel();
    expect(vm.state.board[4]).toBe("X");
    expect(vm.state.currentPlayer).toBe("O");
  });

  it("reports an occupied cell without changing state", () => {
    const c = createController(() => {});
    c.playerMove(0);
    c.playerMove(0);
    const vm = c.getViewModel();
    expect(vm.message).toMatch(/occupied/);
    expect(vm.state.currentPlayer).toBe("O");
  });

  it("locks the board after a win", () => {
    const c = createController(() => {});
    [0, 3, 1, 4, 2].forEach((p) => c.playerMove(p));
    const vm = c.getViewModel();
    expect(vm.state.winner).toBe("X");
    expect(vm.locked).toBe(true);
    c.playerMove(8);
    expect(c.getViewModel().state.board[8]).toBeNull();
  });

  it("reset starts a fresh game", () => {
    const c = createController(() => {});
    c.playerMove(0);
    c.reset();
    expect(c.getViewModel().state.board.every((cell) => cell === null)).toBe(true);
  });
});

describe("web controller (vs computer)", () => {
  it("replies as O after a delay and blocks input meanwhile", () => {
    const c = createController(() => {}, 100);
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

  it("changing mode cancels a pending computer move", () => {
    const c = createController(() => {}, 100);
    c.setMode("computer");
    c.playerMove(0);
    c.setMode("two-players");
    vi.advanceTimersByTime(200);
    expect(c.getViewModel().state.board.every((cell) => cell === null)).toBe(true);
  });

  it("never loses against varied human move sequences", () => {
    const c = createController(() => {}, 1);
    c.setMode("computer");
    for (let seed = 0; seed < 20; seed++) {
      c.reset();
      let n = seed;
      while (c.getViewModel().state.status === "in-progress") {
        const empty = c
          .getViewModel()
          .state.board.flatMap((cell, i) => (cell === null ? [i] : []));
        c.playerMove(empty[n % empty.length] as number);
        n += 3;
        vi.advanceTimersByTime(1);
      }
      expect(c.getViewModel().state.winner).not.toBe("X");
    }
  });
});
