export type Player = "X" | "O";

export type Cell = Player | null;

export type Board = [
  Cell, Cell, Cell,
  Cell, Cell, Cell,
  Cell, Cell, Cell
];

export type GameStatus = "in-progress" | "won" | "draw";

export interface GameState {
  board: Board;
  currentPlayer: Player;
  status: GameStatus;
  winner: Player | null;
}

const winningCombinations: [number, number, number][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function createGame(): GameState {
  return {
    board: [null, null, null, null, null, null, null, null, null],
    currentPlayer: "X",
    status: "in-progress",
    winner: null,
  };
}

export function checkWinner(board: Board): Player | null {
  for (const [a, b, c] of winningCombinations) {
    const cell = board[a] ?? null;
    if (cell !== null && cell === board[b] && cell === board[c]) {
      return cell;
    }
  }
  return null;
}

export function getWinningLine(board: Board): [number, number, number] | null {
  for (const line of winningCombinations) {
    const [a, b, c] = line;
    const cell = board[a] ?? null;
    if (cell !== null && cell === board[b] && cell === board[c]) {
      return line;
    }
  }
  return null;
}

export function isBoardFull(board: Board): boolean {
  return board.every((cell) => cell !== null);
}

function validateMove(state: GameState, position: number): void {
  if (state.status !== "in-progress") {
    throw new Error("The game is already over. No more moves are allowed.");
  }
  if (!Number.isInteger(position) || position < 0 || position > 8) {
    throw new Error(`Invalid position "${position}". Choose an integer from 0 to 8.`);
  }
  if (state.board[position] !== null) {
    throw new Error(`Position ${position} is already occupied.`);
  }
}

export function makeMove(state: GameState, position: number): GameState {
  validateMove(state, position);

  const board: Board = [...state.board];
  board[position] = state.currentPlayer;

  const winner = checkWinner(board);
  if (winner !== null) {
    return { board, currentPlayer: state.currentPlayer, status: "won", winner };
  }
  if (isBoardFull(board)) {
    return { board, currentPlayer: state.currentPlayer, status: "draw", winner: null };
  }
  return {
    board,
    currentPlayer: state.currentPlayer === "X" ? "O" : "X",
    status: "in-progress",
    winner: null,
  };
}

export function getGameResult(state: GameState): string {
  if (state.status === "won" && state.winner !== null) {
    return `Player ${state.winner} wins!`;
  }
  if (state.status === "draw") {
    return "It's a draw!";
  }
  return `Player ${state.currentPlayer}'s turn.`;
}
