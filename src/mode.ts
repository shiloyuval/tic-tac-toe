import type { Player } from "./game.js";

export type GameMode = "two-players" | "computer";

export const COMPUTER_PLAYER: Player = "O";

export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTIES: readonly Difficulty[] = ["easy", "medium", "hard"];

export const DEFAULT_DIFFICULTY: Difficulty = "medium";
