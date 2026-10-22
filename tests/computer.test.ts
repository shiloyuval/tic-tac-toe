import { describe, expect, it } from "vitest";
import { chooseComputerMove } from "../src/computer.js";
import { createGame, makeMove } from "../src/game.js";
import type { GameState } from "../src/game.js";

function play(moves: number[]): GameState {
  return moves.reduce((state, position) => makeMove(state, position), createGame());
}

function emptyPositions(state: GameState): number[] {
  return state.board.flatMap((cell, index) => (cell === null ? [index] : []));
}

// Plays every possible human move against the computer (as O) and
// returns true if the human ever wins.
function humanCanBeatComputer(state: GameState): boolean {
  if (state.status === "won") return state.winner === "X";
  if (state.status === "draw") return false;

  if (state.currentPlayer === "O") {
    return humanCanBeatComputer(makeMove(state, chooseComputerMove(state)));
  }
  return emptyPositions(state).some((position) =>
    humanCanBeatComputer(makeMove(state, position))
  );
}

describe("chooseComputerMove", () => {
  it("chooses the first empty position", () => {
    const state = play([4]);
    expect(chooseComputerMove(state)).toBe(0);
  });

  it("does not modify the state it is given", () => {
    const state = play([0, 4]);
    const snapshot = structuredClone(state);
    chooseComputerMove(state);
    expect(state).toEqual(snapshot);
  });

  it("rejects finished games", () => {
    const won = play([0, 3, 1, 4, 2]);
    expect(() => chooseComputerMove(won)).toThrow(/already over/i);
  });

  it("can be beaten by a player who makes a winning line", () => {
    let state = makeMove(createGame(), 4);
    state = makeMove(state, chooseComputerMove(state));
    state = makeMove(state, 2);
    state = makeMove(state, chooseComputerMove(state));
    state = makeMove(state, 6);

    expect(state.status).toBe("won");
    expect(state.winner).toBe("X");
  });

  it("can be beaten against a human strategy tree", () => {
    expect(humanCanBeatComputer(createGame())).toBe(true);
  });
});
