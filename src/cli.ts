import { createInterface } from "node:readline/promises";
import type { Interface } from "node:readline/promises";
import { chooseComputerMove } from "./computer.js";
import { createGame, getGameResult, makeMove } from "./game.js";
import type { Board, GameState } from "./game.js";
import { COMPUTER_PLAYER, DEFAULT_DIFFICULTY } from "./mode.js";
import type { Difficulty, GameMode } from "./mode.js";
import { createGameStore } from "./storage/gameStore.js";
import type { GameStore } from "./storage/gameStore.js";
import { formatScores, outcomeOf, shouldRecord } from "./storage/model.js";
import type { GameData, PausedGame } from "./storage/model.js";

const PAUSE = "pause" as const;

type TurnResult = GameState | typeof PAUSE | null;

interface Session {
  mode: GameMode;
  difficulty: Difficulty;
  state: GameState;
}

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

async function chooseDifficulty(readLine: ReadLine): Promise<Difficulty | null> {
  console.log("\nChoose the computer's difficulty:");
  console.log("  1) Easy (plays randomly)");
  console.log("  2) Medium (wins and blocks when it can, otherwise random)");
  console.log("  3) Hard (unbeatable)");

  while (true) {
    const answer = await readLine("Enter 1, 2 or 3: ");
    if (answer === null) return null;
    const choice = answer.trim();
    if (choice === "1") return "easy";
    if (choice === "2") return "medium";
    if (choice === "3") return "hard";
    console.log(`\n"${choice}" is not a valid choice.\n`);
  }
}

async function playHumanTurn(state: GameState, readLine: ReadLine): Promise<TurnResult> {
  const answer = await readLine(
    `Player ${state.currentPlayer}, choose a position (0-8) or p to pause: `
  );
  if (answer === null) return null;

  const input = answer.trim();
  if (/^p(ause)?$/i.test(input)) return PAUSE;
  if (!/^-?\d+$/.test(input)) {
    console.log(`\n"${input}" is not a number. Enter an integer from 0 to 8, or p to pause.\n`);
    return state;
  }

  try {
    return makeMove(state, Number(input));
  } catch (error) {
    console.log(`\n${error instanceof Error ? error.message : String(error)}\n`);
    return state;
  }
}

function playComputerTurn(state: GameState, difficulty: Difficulty): GameState {
  const position = chooseComputerMove(state, difficulty);
  console.log(`Computer (${state.currentPlayer}) plays position ${position}.\n`);
  return makeMove(state, position);
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function loadData(store: GameStore): Promise<GameData | null> {
  try {
    return await store.load();
  } catch (error) {
    console.log(`Scores and saved games are unavailable: ${describeError(error)}\n`);
    return null;
  }
}

async function discardSavedGame(store: GameStore): Promise<void> {
  try {
    await store.discardPausedGame();
  } catch (error) {
    console.log(`Could not remove the saved game: ${describeError(error)}\n`);
  }
}

// Returns null when input has ended.
async function askYesNo(prompt: string, readLine: ReadLine): Promise<boolean | null> {
  while (true) {
    const answer = await readLine(prompt);
    if (answer === null) return null;
    const choice = answer.trim().toLowerCase();
    if (choice === "y" || choice === "yes") return true;
    if (choice === "n" || choice === "no") return false;
    console.log(`\n"${choice}" is not a valid choice. Enter y or n.\n`);
  }
}

async function chooseResume(
  paused: PausedGame,
  readLine: ReadLine
): Promise<"resume" | "new" | null> {
  console.log("A paused game was found:\n");
  console.log(renderBoard(paused.state.board));
  console.log(`\n${getGameResult(paused.state)}\n`);

  while (true) {
    const resume = await askYesNo("Resume the paused game? (y/n): ", readLine);
    if (resume === null) return null;
    if (resume) return "resume";

    const discard = await askYesNo("Discard it and start a new game? (y/n): ", readLine);
    if (discard === null) return null;
    if (discard) return "new";
  }
}

async function startSession(
  paused: PausedGame | null,
  readLine: ReadLine,
  store: GameStore
): Promise<Session | null> {
  if (paused !== null) {
    const choice = await chooseResume(paused, readLine);
    if (choice === null) return null;

    await discardSavedGame(store);
    if (choice === "resume") {
      console.log("\nResuming the paused game.");
      return { mode: paused.mode, difficulty: paused.difficulty, state: paused.state };
    }
  }

  const mode = await chooseMode(readLine);
  if (mode === null) return null;
  const difficulty = mode === "computer" ? await chooseDifficulty(readLine) : DEFAULT_DIFFICULTY;
  return difficulty === null ? null : { mode, difficulty, state: createGame() };
}

export async function runCli(store: GameStore = createGameStore()): Promise<void> {
  const rl: Interface = createInterface({ input: process.stdin, output: process.stdout });
  // The async iterator buffers lines, so piped input is not lost between prompts.
  const lines = rl[Symbol.asyncIterator]();
  let closed = false;
  rl.on("close", () => {
    closed = true;
  });
  const readLine: ReadLine = async (prompt) => {
    // Piped input may already have ended; buffered lines must still be consumed.
    if (!closed) {
      rl.setPrompt(prompt);
      rl.prompt();
    }
    const next = await lines.next();
    return next.done ? null : next.value;
  };

  try {
    console.log("Tic-Tac-Toe\n");
    let data = await loadData(store);
    if (data !== null) console.log(`${formatScores(data.scores)}\n`);

    const session = await startSession(data?.pausedGame ?? null, readLine, store);
    if (session === null) {
      console.log("\nInput ended. Game aborted.");
      return;
    }

    const { mode, difficulty } = session;
    let { state } = session;
    console.log("\nEnter a position (0-8) to place your symbol, or p to pause and save the game.\n");

    while (state.status === "in-progress") {
      console.log(renderBoard(state.board));
      console.log(`\n${getGameResult(state)}`);

      if (mode === "computer" && state.currentPlayer === COMPUTER_PLAYER) {
        state = playComputerTurn(state, difficulty);
        continue;
      }

      const next = await playHumanTurn(state, readLine);
      if (next === null) {
        console.log("\nInput ended. Game aborted.");
        return;
      }
      if (next === PAUSE) {
        try {
          await store.pauseGame(state, mode, difficulty);
          console.log("\nGame paused and saved. Start the game again to resume it.");
          return;
        } catch (error) {
          console.log(`\nCould not save the paused game: ${describeError(error)}\n`);
          continue;
        }
      }
      state = next;
    }

    console.log(`\n${renderBoard(state.board)}\n`);
    console.log(getGameResult(state));

    const outcome = outcomeOf(state);
    if (outcome !== null && shouldRecord(mode)) {
      try {
        data = await store.finishGame(outcome);
      } catch (error) {
        console.log(`\nCould not save the result: ${describeError(error)}`);
      }
    }
    if (data !== null) console.log(`\n${formatScores(data.scores)}`);
  } finally {
    rl.close();
  }
}
