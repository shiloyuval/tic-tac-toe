# Tic-Tac-Toe Web — Mission File

## 1. Mission

Turn the existing console Tic-Tac-Toe game into a game playable in the browser, reusing the existing pure game logic (`src/game.ts`) and computer opponent (`src/computer.ts`). The console version must keep working.

## 2. Decisions

- **Frontend:** Vanilla TypeScript + HTML + CSS, bundled by **Vite** (Vite is already in `package.json`). No framework: the UI is one board, a mode selector, and a status line, so a framework adds nothing.
- **No backend for the game itself:** `game.ts` and `computer.ts` are pure and have no Node dependencies, so they run directly in the browser. (Scores and the paused game are stored by a small Node server, see [tic-tac-toe-persistent.md](./tic-tac-toe-persistent.md).)
- **Constraints from `tic-tac-toe.md` still apply:** TypeScript, ES modules, npm, Vitest, no `any`, small focused functions.
- **Reuse, don't copy:** the web code imports from `src/game.ts` and `src/computer.ts`. Don't import `cli.ts` (it uses `node:readline`).

## 3. Target structure

```
index.html            # Vite entry (project root)
vite.config.ts        # only if config is needed (e.g. root/outDir)
src/
  game.ts             # unchanged
  computer.ts         # unchanged
  cli.ts, index.ts    # unchanged (console version)
  web/
    main.ts           # entry: wires state, DOM and events
    view.ts           # render(state, mode) -> updates DOM (pure DOM, no game rules)
    controller.ts     # mode handling, human/computer turn flow, reset
    styles.css
tests/
  web/controller.test.ts
```

## 4. Steps

### Step 1 — Tooling
1. Add scripts to `package.json`: `web` / `dev:web` (`vite`), `build:web` (`vite build`), `preview:web` (`vite preview`). Keep the existing CLI scripts.
2. Check `tsconfig.json`: add the `DOM` lib (or a separate `tsconfig` for `src/web`) so `document`/`HTMLElement` typecheck, while keeping `npm run typecheck` green.
3. Add `vite.config.ts` only if the defaults are insufficient.

### Step 2 — HTML shell (`index.html`)
- Title, `<main>` containing:
  - mode selector (radio/buttons: "Two players" / "Vs computer");
  - a 3×3 board of 9 `<button>` elements (`data-position="0..8"`, `aria-label="Cell N"`);
  - a status line with `aria-live="polite"` (turn / winner / draw / error);
  - a "New game" button.
- `<script type="module" src="/src/web/main.ts">`.

### Step 3 — Controller (`controller.ts`)
Framework-free and DOM-free so it is unit-testable.
- Holds `{ state: GameState, mode: GameMode }`.
- `playerMove(position)`: ignore if the game is over or it's the computer's turn; call `makeMove`; catch errors and expose the message (occupied cell, etc.).
- In computer mode (human = X, computer = O, matching the CLI): after the human move, if still in progress, call `chooseComputerMove` and `makeMove`. Add a short delay (~300–500 ms) via `setTimeout` for natural feel, and block input while the computer "thinks".
- `setMode(mode)` and `reset()` re-create the game with `createGame()`.
- Status text is built with the existing `getGameResult`.
- Move the `GameMode` type and the `COMPUTER_PLAYER` constant to a shared place (e.g. `src/mode.ts`) or re-declare them for the web, so the web code does not import from `cli.ts`.

### Step 4 — View (`view.ts`)
- `render()` sets each cell's text from `state.board`, disables occupied cells and all cells when the game is over, and updates the status line.
- On a win, highlight the winning line. This needs the winning combination; either export a `getWinningLine(board)` helper from `game.ts` (small additive change plus a test) or compute it in the view.
- Mark the active mode in the selector.

### Step 5 — Wiring (`main.ts`)
- Query DOM elements, create the controller, attach click listeners (event delegation on the board), the mode change and the "New game" handlers, then do the initial render.

### Step 6 — Styling (`styles.css`)
- Centered responsive board (CSS grid, square cells, large X/O glyphs), distinct colors for X and O, hover/focus states, visible winning-line highlight, a dark-mode-friendly palette, and a mobile layout.
- Keyboard accessible (native buttons, visible focus ring).

### Step 7 — Tests
- Keep existing `game.test.ts` and `computer.test.ts` passing.
- Add `tests/web/controller.test.ts` (Vitest, no DOM needed; use fake timers for the computer delay):
  - human move updates the board and switches turn;
  - occupied cell and post-game moves yield an error and no state change;
  - in computer mode the computer replies as O and input is blocked while it thinks;
  - a player can beat the computer on Easy (a play-through with a fixed random source) and never beats it on Hard;
  - reset and mode change start a fresh game.
- Optional: a DOM render test with `jsdom` / `happy-dom` (dev dependency) and/or a Playwright smoke test.

### Step 8 — Manual verification
- `npm run dev:web`, then play: two-player win, draw, vs-computer, new game, switching mode mid-game, keyboard-only play, and a narrow viewport.
- `npm run build:web` succeeds and `npm run preview:web` serves the built site.

### Step 9 — Docs
- Update the README / `package.json` description: the project now has both a console and a web version, with the commands for each.

## 5. Acceptance criteria

- [ ] `npm run dev:web` opens a playable game in the browser.
- [ ] Both modes work: two players, and vs. the computer as O (difficulty levels were added later, see [tic-tac-toe-difficult.md](./tic-tac-toe-difficult.md)).
- [ ] Illegal moves are impossible or clearly reported; no moves after game end.
- [ ] The winner, draw and current turn are always shown; the winning line is highlighted.
- [ ] "New game" resets the board; changing mode resets the game.
- [ ] The UI is responsive and keyboard accessible.
- [ ] `game.ts` and `computer.ts` contain no browser or Node-specific code, and `npm run play` still works.
- [ ] `npm run typecheck`, `npm test` and `npm run build:web` all pass.

## 6. Out of scope

Online multiplayer, accounts, adaptive difficulty, and animations beyond simple CSS transitions. (Persistence and the three fixed difficulty levels were added later; see [tic-tac-toe-persistent.md](./tic-tac-toe-persistent.md) and [tic-tac-toe-difficult.md](./tic-tac-toe-difficult.md).)
