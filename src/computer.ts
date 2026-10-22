import { makeMove } from "./game.js";
import type { GameState, Player } from "./game.js";
import { DEFAULT_DIFFICULTY } from "./mode.js";
import type { Difficulty } from "./mode.js";

export type RandomSource = () => number;

function emptyPositions(state: GameState): number[] {
  return state.board.flatMap((cell, index) => (cell === null ? [index] : []));
}

function pickRandom(positions: number[], random: RandomSource): number {
  const index = Math.min(Math.floor(random() * positions.length), positions.length - 1);
  return positions[index] as number;
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

function chooseBestMove(state: GameState): number {
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

function findWinningMove(state: GameState): number | null {
  return (
    emptyPositions(state).find((position) => makeMove(state, position).status === "won") ?? null
  );
}

// The opponent's winning cell, found by letting them move now.
function findBlockingMove(state: GameState): number | null {
  const opponent: Player = state.currentPlayer === "X" ? "O" : "X";
  return findWinningMove({ ...state, currentPlayer: opponent });
}

function chooseMediumMove(state: GameState, random: RandomSource): number {
  return (
    findWinningMove(state) ?? findBlockingMove(state) ?? pickRandom(emptyPositions(state), random)
  );
}

export function chooseComputerMove(
  state: GameState,
  difficulty: Difficulty = DEFAULT_DIFFICULTY,
  random: RandomSource = Math.random
): number {
  if (state.status !== "in-progress") {
    throw new Error("The game is already over. The computer cannot move.");
  }

  switch (difficulty) {
    case "easy":
      return pickRandom(emptyPositions(state), random);
    case "medium":
      return chooseMediumMove(state, random);
    case "hard":
      return chooseBestMove(state);
  }
}
