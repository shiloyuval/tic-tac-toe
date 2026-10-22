import { describe, expect, it } from "vitest";
import {
  checkWinner,
  createGame,
  getGameResult,
  isBoardFull,
  makeMove,
} from "../src/game.js";
import type { Board, GameState } from "../src/game.js";

function play(moves: number[], state: GameState = createGame()): GameState {
  return moves.reduce((current, position) => makeMove(current, position), state);
}

// X: 0,1,5,6,7  O: 2,3,4,8 — full board, no winner
const drawMoves = [0, 2, 1, 3, 5, 4, 6, 8, 7];

describe("createGame", () => {
  it("creates an empty board", () => {
    const game = createGame();
    expect(game.board).toHaveLength(9);
    expect(game.board.every((cell) => cell === null)).toBe(true);
  });

  it("starts with player X, in-progress status and no winner", () => {
    const game = createGame();
    expect(game.currentPlayer).toBe("X");
    expect(game.status).toBe("in-progress");
    expect(game.winner).toBeNull();
  });

  it("returns independent states on each call", () => {
    const first = createGame();
    const second = createGame();
    expect(first).not.toBe(second);
    expect(first.board).not.toBe(second.board);
    makeMove(first, 0);
    expect(second.board[0]).toBeNull();
  });
});

describe("makeMove - valid moves", () => {
  it("lets X occupy an empty cell", () => {
    const game = makeMove(createGame(), 4);
    expect(game.board[4]).toBe("X");
  });

  it("lets O play after X", () => {
    const game = play([4, 0]);
    expect(game.board[0]).toBe("O");
  });

  it("alternates turns after non-final moves", () => {
    const afterX = makeMove(createGame(), 0);
    expect(afterX.currentPlayer).toBe("O");
    const afterO = makeMove(afterX, 1);
    expect(afterO.currentPlayer).toBe("X");
    expect(afterO.status).toBe("in-progress");
  });

  it("places the expected symbols after each move", () => {
    const game = play([0, 1, 2]);
    expect(game.board).toEqual(["X", "O", "X", null, null, null, null, null, null]);
  });
});

describe("makeMove - invalid moves", () => {
  it("rejects negative positions", () => {
    expect(() => makeMove(createGame(), -1)).toThrow(/invalid position/i);
  });

  it("rejects positions greater than 8", () => {
    expect(() => makeMove(createGame(), 9)).toThrow(/invalid position/i);
  });

  it("rejects non-integer positions", () => {
    expect(() => makeMove(createGame(), 1.5)).toThrow(/invalid position/i);
    expect(() => makeMove(createGame(), Number.NaN)).toThrow(/invalid position/i);
  });

  it("rejects occupied cells", () => {
    const game = makeMove(createGame(), 0);
    expect(() => makeMove(game, 0)).toThrow(/occupied/i);
  });

  it("rejects moves after a win", () => {
    const won = play([0, 3, 1, 4, 2]);
    expect(() => makeMove(won, 8)).toThrow(/game is already over/i);
  });

  it("rejects moves after a draw", () => {
    const drawn = play(drawMoves);
    expect(drawn.status).toBe("draw");
    expect(() => makeMove(drawn, 0)).toThrow(/game is already over/i);
  });

  it("does not change the original state on invalid moves", () => {
    const game = makeMove(createGame(), 0);
    const snapshot = structuredClone(game);
    expect(() => makeMove(game, 0)).toThrow();
    expect(() => makeMove(game, 42)).toThrow();
    expect(game).toEqual(snapshot);
  });
});

describe("winning conditions", () => {
  const combinations: [string, [number, number, number], [number, number, number]][] = [
    ["top row", [0, 1, 2], [3, 4, 6]],
    ["middle row", [3, 4, 5], [0, 1, 6]],
    ["bottom row", [6, 7, 8], [0, 1, 3]],
    ["left column", [0, 3, 6], [1, 2, 4]],
    ["middle column", [1, 4, 7], [0, 2, 3]],
    ["right column", [2, 5, 8], [0, 1, 3]],
    ["main diagonal", [0, 4, 8], [1, 2, 3]],
    ["anti diagonal", [2, 4, 6], [0, 1, 3]],
  ];

  // Each row: winning line plus three other cells that never form a line themselves.
  describe.each(combinations)("%s", (_name, line, fillers) => {
    const [a, b, c] = line;
    const [f1, f2, f3] = fillers;

    it("is won by X", () => {
      const game = play([a, f1, b, f2, c]);
      expect(game.status).toBe("won");
      expect(game.winner).toBe("X");
      expect(game.currentPlayer).toBe("X");
      expect(getGameResult(game)).toBe("Player X wins!");
    });

    it("is won by O", () => {
      const game = play([f1, a, f2, b, f3, c]);
      expect(game.status).toBe("won");
      expect(game.winner).toBe("O");
      expect(game.currentPlayer).toBe("O");
      expect(getGameResult(game)).toBe("Player O wins!");
    });
  });

  it("checkWinner returns null for an empty board", () => {
    expect(checkWinner(createGame().board)).toBeNull();
  });

  it("does not treat three empty cells as a win", () => {
    const board: Board = ["X", "O", null, null, null, null, null, null, null];
    expect(checkWinner(board)).toBeNull();
  });
});

describe("draw conditions", () => {
  it("ends in a draw when the board is full without a winner", () => {
    const game = play(drawMoves);
    expect(isBoardFull(game.board)).toBe(true);
    expect(game.status).toBe("draw");
    expect(game.winner).toBeNull();
    expect(getGameResult(game)).toBe("It's a draw!");
  });

  it("declares a win, not a draw, when the last move completes a line", () => {
    // X0 O1 X2 O3 X4 O5 X7 O6 X8: X completes 0,4,8 with the ninth move
    const game = play([0, 1, 2, 3, 4, 5, 7, 6, 8]);
    expect(isBoardFull(game.board)).toBe(true);
    expect(game.status).toBe("won");
    expect(game.winner).toBe("X");
  });

  it("does not end the game early when there is no winner and the board is not full", () => {
    const game = play([0, 1, 2, 4, 3, 5, 7, 6]);
    expect(isBoardFull(game.board)).toBe(false);
    expect(game.status).toBe("in-progress");
    expect(game.winner).toBeNull();
  });
});

describe("isBoardFull", () => {
  it("returns false for a board with empty cells", () => {
    expect(isBoardFull(createGame().board)).toBe(false);
  });
});

describe("immutability", () => {
  it("returns a new state and board for a valid move", () => {
    const original = createGame();
    const next = makeMove(original, 0);
    expect(next).not.toBe(original);
    expect(next.board).not.toBe(original.board);
  });

  it("leaves the original state unchanged after a valid move", () => {
    const original = createGame();
    const snapshot = structuredClone(original);
    makeMove(original, 4);
    expect(original).toEqual(snapshot);
  });

  it("does not mutate inputs in checkWinner and getGameResult", () => {
    const game = play([0, 3, 1, 4, 2]);
    const snapshot = structuredClone(game);
    checkWinner(game.board);
    getGameResult(game);
    expect(game).toEqual(snapshot);
  });
});

describe("getGameResult", () => {
  it("indicates which player is next while the game is in progress", () => {
    expect(getGameResult(createGame())).toBe("Player X's turn.");
    expect(getGameResult(makeMove(createGame(), 0))).toBe("Player O's turn.");
  });
});
