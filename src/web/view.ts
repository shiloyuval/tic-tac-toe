import { getWinningLine } from "../game.js";
import type { Scores } from "../storage/model.js";
import type { ViewModel } from "./controller.js";

export interface Elements {
  cells: HTMLButtonElement[];
  status: HTMLElement;
  modeInputs: HTMLInputElement[];
  difficultyGroup: HTMLElement;
  difficultyInputs: HTMLInputElement[];
  scoreValues: { player1: HTMLElement; player2: HTMLElement; draws: HTMLElement };
  scoresNote: HTMLElement;
  pauseButton: HTMLButtonElement;
  resetScoresButton: HTMLButtonElement;
}

function scoreText(scores: Scores | null, key: keyof Scores): string {
  return scores === null ? "–" : String(scores[key]);
}

function scoresNote(vm: ViewModel): string {
  if (vm.persistence === "loading") return "Loading scores…";
  if (vm.persistence === "unavailable") return "Scores and pause are unavailable (saving is not possible here).";
  if (vm.mode === "computer") return "Games against the computer are not scored.";
  return "";
}

export function render(els: Elements, vm: ViewModel): void {
  const winningLine: number[] = getWinningLine(vm.state.board) ?? [];

  els.cells.forEach((cell, index) => {
    const value = vm.state.board[index] ?? null;
    cell.textContent = value ?? "";
    cell.dataset.player = value ?? "";
    cell.disabled = vm.locked || value !== null;
    cell.classList.toggle("win", winningLine.includes(index));
    cell.setAttribute("aria-label", `Cell ${index}${value ? `, ${value}` : ", empty"}`);
  });

  els.status.textContent = vm.message;
  for (const input of els.modeInputs) {
    input.checked = input.value === vm.mode;
  }
  els.difficultyGroup.hidden = vm.mode !== "computer";
  for (const input of els.difficultyInputs) {
    input.checked = input.value === vm.difficulty;
  }

  els.scoreValues.player1.textContent = scoreText(vm.scores, "player1Wins");
  els.scoreValues.player2.textContent = scoreText(vm.scores, "player2Wins");
  els.scoreValues.draws.textContent = scoreText(vm.scores, "draws");
  els.scoresNote.textContent = scoresNote(vm);

  els.pauseButton.textContent = vm.paused ? "Resume" : "Pause";
  els.pauseButton.disabled = !vm.paused && !vm.canPause;
  els.resetScoresButton.disabled = vm.persistence !== "available";
}
