import { getWinningLine } from "../game.js";
import type { ViewModel } from "./controller.js";

export interface Elements {
  cells: HTMLButtonElement[];
  status: HTMLElement;
  modeInputs: HTMLInputElement[];
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
}
