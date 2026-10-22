import { describe, expect, it } from "vitest";
import { chooseComputerMove } from "../src/computer.js";
import { createGame, makeMove } from "../src/game.js";
import type { GameState } from "../src/game.js";
import type { Difficulty } from "../src/mode.js";

function play(moves: number[]): GameState {
  return moves.reduce((state, position) => makeMove(state, position), createGame());
}

function emptyPositions(state: GameState): number[] {
  return state.board.flatMap((cell, index) => (cell === null ? [index] : []));
}

const first = () => 0;
const last = () => 0.999;

// Plays every possible human move against the computer (as O) and
// returns true if the human ever wins.
function humanCanBeatComputer(state: GameState, difficulty: Difficulty): boolean {
  if (state.status === "won") return state.winner === "X";
  if (state.status === "draw") return false;

  if (state.currentPlayer === "O") {
    return humanCanBeatComputer(makeMove(state, chooseComputerMove(state, difficulty)), difficulty);
  }
  return emptyPositions(state).some((position) =>
    humanCanBeatComputer(makeMove(state, position), difficulty)
  );
}

// Alternates the given human moves with the computer's replies; returns the replies too.
function playAgainstComputer(humanMoves: number[], difficulty: Difficulty) {
  let state = createGame();
  const replies: number[] = [];
  humanMoves.forEach((position, index) => {
    state = makeMove(state, position);
    if (state.status === "in-progress" && index < humanMoves.length - 1) {
      const reply = chooseComputerMove(state, difficulty, first);
      replies.push(reply);
      state = makeMove(state, reply);
    }
  });
  return { state, replies };
}

describe.each<Difficulty>(["easy", "medium", "hard"])("chooseComputerMove (%s)", (difficulty) => {
  it("returns an empty position", () => {
    const state = play([4]);
    expect(emptyPositions(state)).toContain(chooseComputerMove(state, difficulty, last));
  });

  it("does not modify the state it is given", () => {
    const state = play([0, 4]);
    const snapshot = structuredClone(state);
    chooseComputerMove(state, difficulty);
    expect(state).toEqual(snapshot);
  });

  it("rejects finished games", () => {
    const won = play([0, 3, 1, 4, 2]);
    expect(() => chooseComputerMove(won, difficulty)).toThrow(/already over/i);
  });
});

describe("chooseComputerMove (easy)", () => {
  it("picks the empty position selected by the random source", () => {
    const state = play([4]);
    expect(chooseComputerMove(state, "easy", first)).toBe(0);
    expect(chooseComputerMove(state, "easy", last)).toBe(8);
  });

  it("stays in range when the random source returns 1", () => {
    expect(chooseComputerMove(play([4]), "easy", () => 1)).toBe(8);
  });

  it("does not block an opponent's winning move", () => {
    // X has 0 and 1 and threatens 2; a random pick of the last free cell ignores it.
    expect(chooseComputerMove(play([0, 4, 1]), "easy", last)).toBe(8);
  });

  it("can be beaten by a player who makes a winning line", () => {
    const { state } = playAgainstComputer([4, 2, 6], "easy");
    expect(state.winner).toBe("X");
  });
});

describe("chooseComputerMove (medium)", () => {
  it("takes an immediate win even when it also has to block", () => {
    // O has 3 and 4 and wins at 5; X has 0 and 1 and threatens 2.
    const state = play([0, 3, 1, 4, 8]);
    expect(state.currentPlayer).toBe("O");
    expect(chooseComputerMove(state, "medium", first)).toBe(5);
  });

  it("blocks the opponent's immediate win", () => {
    const state = play([0, 4, 1]);
    expect(chooseComputerMove(state, "medium", last)).toBe(2);
  });

  it("uses the random source when there is nothing to win or block", () => {
    const state = play([4]);
    expect(chooseComputerMove(state, "medium", first)).toBe(0);
    expect(chooseComputerMove(state, "medium", last)).toBe(8);
  });

  it("is the default level", () => {
    expect(chooseComputerMove(play([0, 4, 1]))).toBe(2);
  });

  it("can be beaten with a fork", () => {
    // X plays 0, 4, 6: the second threat cannot be blocked as well.
    const { state, replies } = playAgainstComputer([0, 4, 6, 3], "medium");
    expect(replies).toEqual([1, 8, 2]);
    expect(state.status).toBe("won");
    expect(state.winner).toBe("X");
  });
});

describe("chooseComputerMove (hard)", () => {
  it("takes an immediate win", () => {
    expect(chooseComputerMove(play([0, 3, 1, 4, 8]), "hard")).toBe(5);
  });

  it("blocks the opponent's immediate win", () => {
    expect(chooseComputerMove(play([0, 4, 1]), "hard")).toBe(2);
  });

  it("never loses when playing O against every possible human strategy", () => {
    expect(humanCanBeatComputer(createGame(), "hard")).toBe(false);
  });
});
