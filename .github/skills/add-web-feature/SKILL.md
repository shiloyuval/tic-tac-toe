---
name: add-web-feature
description: "Add or change a feature of the browser version of the game while keeping the logic/UI separation. Use when the user asks to add, change or fix something in the web UI, such as a score board, new button, animation, setting or layout change."
---

# Add Web Feature

Implement web changes without breaking the project architecture (see `.github/copilot-instructions.md`).

## Where Code Goes

| Concern | File |
|---|---|
| Game rules, win/draw detection | `src/game.ts` (never in UI code) |
| Computer opponent | `src/computer.ts` |
| Shared types/constants (`GameMode`, `COMPUTER_PLAYER`) | `src/mode.ts` |
| Turn flow, mode handling, timers, error messages | `src/web/controller.ts` (DOM-free) |
| Rendering state to the DOM | `src/web/view.ts` (no game rules) |
| Event wiring | `src/web/main.ts` |
| Markup / styles | `index.html`, `src/web/styles.css` |

## Procedure

1. Read the relevant files first and reuse existing helpers.
2. Decide which layer owns the change using the table above. Rules go in `game.ts`; state and flow go in the controller; the view only renders what `getViewModel()` returns.
3. Extend the `ViewModel` rather than letting the view inspect rules or timers.
4. Never import `cli.ts` or `node:*` modules in `src/web/`, and never use the DOM in the controller.
5. Keep the UI accessible: native buttons, visible focus, `aria-live` status, usable at mobile width, readable in light and dark mode.
6. Write or update tests first-class: controller behavior in `tests/web/controller.test.ts` (fake timers, no DOM), rule changes in `tests/game.test.ts`.
7. Do not add dependencies or a frontend framework.
8. Run the `verify-changes` skill, and the `manual-web-check` skill for visible changes.
9. Update docs with the `update-docs` skill if behavior or commands changed.
