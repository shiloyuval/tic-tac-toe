import { createInterface } from "node:readline/promises";
import { createGame, getGameResult, makeMove } from "./game.js";
import type { Board, GameState } from "./game.js";

export function renderBoard(board: Board): string {
  const labels = board.map((cell, index) => cell ?? String(index));
  const row = (start: number): string =>
    ` ${labels[start]} | ${labels[start + 1]} | ${labels[start + 2]}`;
  const separator = "---+---+---";
  return [row(0), separator, row(3), separator, row(6)].join("\n");
}

export async function runCli(): Promise<void> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  // The async iterator buffers lines, so piped input is not lost between prompts.
  const lines = rl[Symbol.asyncIterator]();

  try {
    let state: GameState = createGame();
    console.log("Tic-Tac-Toe: enter a position (0-8) to place your symbol.\n");

    while (state.status === "in-progress") {
      console.log(renderBoard(state.board));
      console.log(`\n${getGameResult(state)}`);

      rl.setPrompt(`Player ${state.currentPlayer}, choose a position (0-8): `);
      rl.prompt();
      const next = await lines.next();
      if (next.done) {
        console.log("\nInput ended. Game aborted.");
        return;
      }

      const input = next.value.trim();
      if (!/^-?\d+$/.test(input)) {
        console.log(`\n"${input}" is not a number. Enter an integer from 0 to 8.\n`);
        continue;
      }

      try {
        state = makeMove(state, Number(input));
      } catch (error) {
        console.log(`\n${error instanceof Error ? error.message : String(error)}\n`);
      }
    }

    console.log(`\n${renderBoard(state.board)}\n`);
    console.log(getGameResult(state));
  } finally {
    rl.close();
  }
}
