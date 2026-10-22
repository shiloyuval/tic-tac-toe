import "./styles.css";
import type { GameMode } from "../mode.js";
import { createApiClient } from "./apiClient.js";
import { createController } from "./controller.js";
import { render } from "./view.js";
import type { Elements } from "./view.js";

function requireElement<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing element: ${selector}`);
  return el;
}

const els: Elements = {
  cells: Array.from(document.querySelectorAll<HTMLButtonElement>("[data-position]")),
  status: requireElement<HTMLElement>("#status"),
  modeInputs: Array.from(document.querySelectorAll<HTMLInputElement>("input[name='mode']")),
  scoreValues: {
    player1: requireElement<HTMLElement>("#score-player1"),
    player2: requireElement<HTMLElement>("#score-player2"),
    draws: requireElement<HTMLElement>("#score-draws"),
  },
  scoresNote: requireElement<HTMLElement>("#scores-note"),
  pauseButton: requireElement<HTMLButtonElement>("#pause"),
  resetScoresButton: requireElement<HTMLButtonElement>("#reset-scores"),
};

const controller = createController({
  api: createApiClient(),
  onChange: () => render(els, controller.getViewModel()),
});

// Discarding a saved paused game cannot be undone, so ask first.
function confirmDiscardingSavedGame(): boolean {
  return !controller.getViewModel().hasSavedGame || window.confirm("Discard the saved paused game?");
}

requireElement<HTMLElement>("#board").addEventListener("click", (event) => {
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-position]");
  if (target) controller.playerMove(Number(target.dataset.position));
});

for (const input of els.modeInputs) {
  input.addEventListener("change", () => {
    if (confirmDiscardingSavedGame()) controller.setMode(input.value as GameMode);
    else render(els, controller.getViewModel());
  });
}

els.pauseButton.addEventListener("click", () => {
  if (controller.getViewModel().paused) controller.resume();
  else void controller.pause();
});

requireElement<HTMLButtonElement>("#new-game").addEventListener("click", () => {
  if (confirmDiscardingSavedGame()) controller.reset();
});

els.resetScoresButton.addEventListener("click", () => {
  if (window.confirm("Reset all scores?")) void controller.resetScores();
});

render(els, controller.getViewModel());
void controller.init();
