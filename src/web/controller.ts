import { chooseComputerMove } from "../computer.js";
import { createGame, getGameResult, makeMove } from "../game.js";
import type { GameState } from "../game.js";
import { COMPUTER_PLAYER } from "../mode.js";
import type { GameMode } from "../mode.js";

export interface ViewModel {
  state: GameState;
  mode: GameMode;
  message: string;
  locked: boolean;
}

export interface Controller {
  getViewModel(): ViewModel;
  playerMove(position: number): void;
  setMode(mode: GameMode): void;
  reset(): void;
}

export const COMPUTER_DELAY_MS = 400;

export function createController(onChange: () => void, delayMs = COMPUTER_DELAY_MS): Controller {
  let state = createGame();
  let mode: GameMode = "two-players";
  let error = "";
  let thinking = false;
  let generation = 0;

  const isComputerTurn = (): boolean =>
    mode === "computer" && state.status === "in-progress" && state.currentPlayer === COMPUTER_PLAYER;

  function scheduleComputerMove(): void {
    thinking = true;
    const current = generation;
    setTimeout(() => {
      if (current !== generation) return;
      thinking = false;
      state = makeMove(state, chooseComputerMove(state));
      onChange();
    }, delayMs);
  }

  function restart(): void {
    generation++;
    thinking = false;
    error = "";
    state = createGame();
    onChange();
  }

  return {
    getViewModel: () => ({
      state,
      mode,
      message: error || getGameResult(state),
      locked: thinking || state.status !== "in-progress",
    }),
    playerMove(position) {
      if (thinking || isComputerTurn()) return;
      try {
        state = makeMove(state, position);
        error = "";
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        onChange();
        return;
      }
      if (isComputerTurn()) scheduleComputerMove();
      onChange();
    },
    setMode(next) {
      mode = next;
      restart();
    },
    reset: restart,
  };
}
