import { makeMove } from "./game.js";
import type { GameState, Player } from "./game.js";

function emptyPositions(state: GameState): number[] {
  return state.board.flatMap((cell, index) => (cell === null ? [index] : []));
}

// Scores a state from `computer`'s point of view; faster wins and slower losses score better.
function minimax(state: GameState, computer: Player, depth: number): number {
  if (state.status === "won") {
    return state.winner === computer ? 10 - depth : depth - 10;
  }
  if (state.status === "draw") {
    return 0;
  }

  const scores = emptyPositions(state).map((position) =>
    minimax(makeMove(state, position), computer, depth + 1)
  );
  return state.currentPlayer === computer ? Math.max(...scores) : Math.min(...scores);
}

export function chooseComputerMove(state: GameState): number {
  if (state.status !== "in-progress") {
    throw new Error("The game is already over. The computer cannot move.");
  }

  const computer = state.currentPlayer;
  let bestPosition = -1;
  let bestScore = -Infinity;

  for (const position of emptyPositions(state)) {
    const score = minimax(makeMove(state, position), computer, 1);
    if (score > bestScore) {
      bestScore = score;
      bestPosition = position;
    }
  }
  return bestPosition;
}
