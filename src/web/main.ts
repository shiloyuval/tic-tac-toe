import "./styles.css";
import type { GameMode } from "../mode.js";
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
};

const controller = createController(() => render(els, controller.getViewModel()));

requireElement<HTMLElement>("#board").addEventListener("click", (event) => {
  const target = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-position]");
  if (target) controller.playerMove(Number(target.dataset.position));
});

for (const input of els.modeInputs) {
  input.addEventListener("change", () => controller.setMode(input.value as GameMode));
}

requireElement<HTMLButtonElement>("#new-game").addEventListener("click", () => controller.reset());

render(els, controller.getViewModel());
