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
  it("returns an empty position", () => {
    const state = play([4]);
    const move = chooseComputerMove(state);
    expect(emptyPositions(state)).toContain(move);
  });

  it("takes an immediate win", () => {
    // O has 3 and 4; X has 0 and 1. O to move and wins at 5.
    const state = play([0, 3, 1, 4, 8]);
    expect(state.currentPlayer).toBe("O");
    expect(chooseComputerMove(state)).toBe(5);
  });

  it("blocks the opponent's immediate win", () => {
    // X has 0 and 1 and threatens 2; O to move must block.
    const state = play([0, 4, 1]);
    expect(chooseComputerMove(state)).toBe(2);
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

  it("never loses when playing O against every possible human strategy", () => {
    expect(humanCanBeatComputer(createGame())).toBe(false);
  });
});
