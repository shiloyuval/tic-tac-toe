import { createInterface } from "node:readline/promises";
import type { Interface } from "node:readline/promises";
import { chooseComputerMove } from "./computer.js";
import { createGame, getGameResult, makeMove } from "./game.js";
import type { Board, GameState } from "./game.js";
import { COMPUTER_PLAYER } from "./mode.js";
import type { GameMode } from "./mode.js";

export function renderBoard(board: Board): string {
  const labels = board.map((cell, index) => cell ?? String(index));
  const row = (start: number): string =>
    ` ${labels[start]} | ${labels[start + 1]} | ${labels[start + 2]}`;
  const separator = "---+---+---";
  return [row(0), separator, row(3), separator, row(6)].join("\n");
}

// Returns null when input has ended.
type ReadLine = (prompt: string) => Promise<string | null>;

async function chooseMode(readLine: ReadLine): Promise<GameMode | null> {
  console.log("Choose a game mode:");
  console.log("  1) Two players");
  console.log("  2) Play against the computer (you are X, the computer is O)");

  while (true) {
    const answer = await readLine("Enter 1 or 2: ");
    if (answer === null) return null;
    const choice = answer.trim();
    if (choice === "1") return "two-players";
    if (choice === "2") return "computer";
    console.log(`\n"${choice}" is not a valid choice.\n`);
  }
}

async function playHumanTurn(state: GameState, readLine: ReadLine): Promise<GameState | null> {
  const answer = await readLine(`Player ${state.currentPlayer}, choose a position (0-8): `);
  if (answer === null) return null;

  const input = answer.trim();
  if (!/^-?\d+$/.test(input)) {
    console.log(`\n"${input}" is not a number. Enter an integer from 0 to 8.\n`);
    return state;
  }

  try {
    return makeMove(state, Number(input));
  } catch (error) {
    console.log(`\n${error instanceof Error ? error.message : String(error)}\n`);
    return state;
  }
}

function playComputerTurn(state: GameState): GameState {
  const position = chooseComputerMove(state);
  console.log(`Computer (${state.currentPlayer}) plays position ${position}.\n`);
  return makeMove(state, position);
}

export async function runCli(): Promise<void> {
  const rl: Interface = createInterface({ input: process.stdin, output: process.stdout });
  // The async iterator buffers lines, so piped input is not lost between prompts.
  const lines = rl[Symbol.asyncIterator]();
  const readLine: ReadLine = async (prompt) => {
    rl.setPrompt(prompt);
    rl.prompt();
    const next = await lines.next();
    return next.done ? null : next.value;
  };

  try {
    console.log("Tic-Tac-Toe\n");
    const mode = await chooseMode(readLine);
    if (mode === null) {
      console.log("\nInput ended. Game aborted.");
      return;
    }

    let state: GameState = createGame();
    console.log("\nEnter a position (0-8) to place your symbol.\n");

    while (state.status === "in-progress") {
      console.log(renderBoard(state.board));
      console.log(`\n${getGameResult(state)}`);

      if (mode === "computer" && state.currentPlayer === COMPUTER_PLAYER) {
        state = playComputerTurn(state);
        continue;
      }

      const next = await playHumanTurn(state, readLine);
      if (next === null) {
        console.log("\nInput ended. Game aborted.");
        return;
      }
      state = next;
    }

    console.log(`\n${renderBoard(state.board)}\n`);
    console.log(getGameResult(state));
  } finally {
    rl.close();
  }
}
