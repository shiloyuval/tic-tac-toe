import { checkWinner, isBoardFull } from "../game.js";
import type { Board, Cell, GameState, Player } from "../game.js";
import type { GameMode } from "../mode.js";

export type Outcome = "player1-win" | "player2-win" | "draw";

export interface Scores {
  player1Wins: number; // Player 1 plays X
  player2Wins: number; // Player 2 plays O
  draws: number;
}

export interface PausedGame {
  state: GameState;
  mode: GameMode;
  pausedAt: string;
}

export interface GameData {
  version: 1;
  scores: Scores;
  pausedGame: PausedGame | null;
}

export interface PauseRequest {
  state: GameState;
  mode: GameMode;
}

const GAME_MODES: readonly GameMode[] = ["two-players", "computer"];
const OUTCOMES: readonly Outcome[] = ["player1-win", "player2-win", "draw"];

export function createEmptyGameData(): GameData {
  return { version: 1, scores: { player1Wins: 0, player2Wins: 0, draws: 0 }, pausedGame: null };
}

export function outcomeOf(state: GameState): Outcome | null {
  if (state.status === "draw") return "draw";
  if (state.status === "won") return state.winner === "X" ? "player1-win" : "player2-win";
  return null;
}

// Only games between two humans are scored.
export function shouldRecord(mode: GameMode): boolean {
  return mode === "two-players";
}

export function formatScores(scores: Scores): string {
  return `Player 1 (X): ${scores.player1Wins} | Player 2 (O): ${scores.player2Wins} | Draws: ${scores.draws}`;
}

export function recordOutcome(data: GameData, outcome: Outcome): GameData {
  const { scores } = data;
  const next: Scores =
    outcome === "player1-win"
      ? { ...scores, player1Wins: scores.player1Wins + 1 }
      : outcome === "player2-win"
        ? { ...scores, player2Wins: scores.player2Wins + 1 }
        : { ...scores, draws: scores.draws + 1 };
  return { ...data, scores: next, pausedGame: null };
}

export function pauseGame(
  data: GameData,
  state: GameState,
  mode: GameMode,
  now: Date = new Date()
): GameData {
  const valid = parseInProgressState(state);
  if (valid === null) {
    throw new Error("Only a valid game that is in progress can be paused.");
  }
  return { ...data, pausedGame: { state: valid, mode, pausedAt: now.toISOString() } };
}

export function clearPausedGame(data: GameData): GameData {
  return { ...data, pausedGame: null };
}

export function resetScores(data: GameData): GameData {
  return { ...data, scores: createEmptyGameData().scores };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCell(value: unknown): value is Cell {
  return value === "X" || value === "O" || value === null;
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

export function parseMode(value: unknown): GameMode | null {
  return GAME_MODES.find((mode) => mode === value) ?? null;
}

export function parseOutcome(value: unknown): Outcome | null {
  return OUTCOMES.find((outcome) => outcome === value) ?? null;
}

// Accepts only a consistent game that is still in progress; never trusts the stored values.
export function parseInProgressState(value: unknown): GameState | null {
  if (!isRecord(value) || !Array.isArray(value.board) || value.board.length !== 9) return null;
  const cells: unknown[] = value.board;
  if (!cells.every(isCell)) return null;

  const board = cells as Board;
  const xCount = board.filter((cell) => cell === "X").length;
  const oCount = board.filter((cell) => cell === "O").length;
  if (xCount !== oCount && xCount !== oCount + 1) return null;

  const expectedPlayer: Player = xCount === oCount ? "X" : "O";
  if (
    value.currentPlayer !== expectedPlayer ||
    value.status !== "in-progress" ||
    value.winner !== null
  ) {
    return null;
  }
  if (checkWinner(board) !== null || isBoardFull(board)) return null;

  return { board: [...board] as Board, currentPlayer: expectedPlayer, status: "in-progress", winner: null };
}

export function parsePauseRequest(value: unknown): PauseRequest | null {
  if (!isRecord(value)) return null;
  const state = parseInProgressState(value.state);
  const mode = parseMode(value.mode);
  return state !== null && mode !== null ? { state, mode } : null;
}

function parsePausedGame(value: unknown): PausedGame | null {
  if (!isRecord(value)) return null;
  const request = parsePauseRequest(value);
  const pausedAt = value.pausedAt;
  if (request === null || typeof pausedAt !== "string" || Number.isNaN(Date.parse(pausedAt))) {
    return null;
  }
  return { ...request, pausedAt };
}

function parseScores(value: unknown): Scores {
  if (
    !isRecord(value) ||
    !isCount(value.player1Wins) ||
    !isCount(value.player2Wins) ||
    !isCount(value.draws)
  ) {
    throw new Error("Invalid scores.");
  }
  return { player1Wins: value.player1Wins, player2Wins: value.player2Wins, draws: value.draws };
}

// Throws for an unusable file; an invalid paused game is dropped so the scores are kept.
export function parseGameData(value: unknown): GameData {
  if (!isRecord(value) || value.version !== 1) {
    throw new Error("Unsupported or invalid game data.");
  }
  return { version: 1, scores: parseScores(value.scores), pausedGame: parsePausedGame(value.pausedGame) };
}
