import { makeMove } from "./game.js";
import type { GameState } from "./game.js";

function emptyPositions(state: GameState): number[] {
  return state.board.flatMap((cell, index) => (cell === null ? [index] : []));
}

export function chooseComputerMove(state: GameState): number {
  if (state.status !== "in-progress") {
    throw new Error("The game is already over. The computer cannot move.");
  }

  const position = emptyPositions(state)[0];
  if (position === undefined) {
    throw new Error("There are no empty positions. The computer cannot move.");
  }
  return position;
}
