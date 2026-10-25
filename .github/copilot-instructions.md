# Project Rules — Tic-Tac-Toe

These rules apply to all work in this repository. Detailed specs: [tic-tac-toe.md](../design/tic-tac-toe.md) (core game and CLI), [tic-tac-toe-web.md](../design/tic-tac-toe-web.md) (web version), [tic-tac-toe-persistent.md](../design/tic-tac-toe-persistent.md) (scores and pause/resume), [tic-tac-toe-github.md](../design/tic-tac-toe-github.md) (GitHub Pages hosting) and [tic-tac-toe-difficult.md](../design/tic-tac-toe-difficult.md) (computer difficulty levels).

## 1. Technology

- TypeScript (strict), ES modules, Node.js, npm.
- Tests: Vitest. Dev runner: `tsx`. Web bundler/dev server: Vite.
- The web frontend is vanilla TypeScript + HTML + CSS. No frontend framework and no database.
- Persistence has two interchangeable backends behind the `GameStorage` interface (`src/web/gameStorage.ts`): the browser's `localStorage` (default, used by the GitHub Pages build) and a single JSON file (`data/game-data.json`, gitignored, path overridable with `GAME_DATA_FILE`) exposed by a small `node:http` server (`src/server`) in `--mode api`. The console game always uses the JSON file.
- The hosted site is deployed by `.github/workflows/deploy.yml` (typecheck, tests, build, GitHub Pages). Keep `base: "./"` in `vite.config.ts`, keep `npm ci` working on Linux, and do not add platform-specific packages as direct dependencies.
- Add a dependency only when the task requires it. Avoid unnecessary abstractions.
- Never use `any` without a documented, compelling reason.
- `tsconfig.json` must keep `strict` and `noUncheckedIndexedAccess` enabled.

## 2. Architecture

```
src/game.ts       Core rules and state (pure, no Node/browser APIs)
src/computer.ts   Computer opponent with Easy / Medium / Hard (minimax) levels (pure)
src/mode.ts       Shared GameMode, Difficulty and COMPUTER_PLAYER
src/storage/      model.ts (pure scores/paused-game model and validation), gameStore.ts (Node-only JSON file store)
src/server/       node:http API for the browser (+ serves dist/ in production)
src/cli.ts        Console UI (Node only)
src/index.ts      Console entry point and top-level error handling
src/web/          Browser UI: controller.ts (DOM-free flow), gameStorage.ts (storage interface), localStorageClient.ts and apiClient.ts (implementations), view.ts (rendering), main.ts (wiring, picks the storage), styles.css
index.html        Vite entry
tests/            Vitest tests (tests/web, tests/storage, tests/server)
```

- All game rules live in `game.ts`. UIs must not detect winners, validate moves, or modify the board themselves.
- Never duplicate winner-detection logic; use `checkWinner()` / `getWinningLine()`.
- `game.ts`, `computer.ts`, `mode.ts` and `storage/model.ts` must not import Node or browser APIs.
- `gameStore.ts` and `src/server/*` are Node-only and must never be imported from `src/web/*`; the web talks to storage only over HTTP.
- `src/web/*` must not import `cli.ts` or `node:*` modules. `cli.ts` must not use the DOM.
- `src/web/controller.ts` stays DOM-free so it can be unit-tested; `view.ts` only renders and contains no game rules.
- Importing a module must never start the game automatically.
- Separate game logic, user interaction, and application startup.

## 3. Game rules

- 3 × 3 board, zero-based positions `0–8`, left-to-right then top-to-bottom. Empty cell = `null`.
- X starts; players alternate.
- A win is three matching symbols in a row, column, or diagonal (8 combinations). Empty cells never count.
- A full board with no winner is a draw. A full board with a winning line is a win, not a draw.
- No moves into occupied cells, outside `0–8`, with non-integers, or after the game has ended.
- After a win or draw, `currentPlayer` stays the player who made the last move.
- Vs-computer mode: the human is X, the computer is O. The computer has three levels (see [tic-tac-toe-difficult.md](../design/tic-tac-toe-difficult.md)): Easy (random), Medium (default: wins and blocks, otherwise random) and Hard (minimax, never loses). Only Hard is unbeatable.

## 3b. Scores and pause

- Only two identities exist: Player 1 (X) and Player 2 (O). No accounts or names.
- Only finished **two-player** games are recorded (`shouldRecord`), exactly once, together with clearing any saved paused game. Games against the computer never change the scores.
- A game can be paused only while in progress (both modes). The paused game (board, turn, mode and computer difficulty) is saved, loaded on the next start, and resumed or discarded by the user. Nothing is saved unless the user pauses. A saved game without a difficulty loads with the default (Medium).
- The scores are shown above the board in the web UI and printed at the start and end of a console game.
- Saved data is never trusted: it is validated on load (`parseGameData`), corrupt files are moved aside, and storage failures must never stop a game from being played.
- Writes are atomic and serialized.

## 4. Coding conventions

- Small, focused functions with clear names; readable and type-safe code.
- Treat `GameState` as immutable: return new objects, never mutate inputs. Invalid moves throw a descriptive `Error` and leave the original state unchanged.
- Read-only functions (`checkWinner`, `getGameResult`, `isBoardFull`, `getWinningLine`) must not mutate their inputs.
- Comment only code that needs clarification.
- Handle UI errors gracefully: CLI must survive non-numeric input, out-of-range positions, occupied cells, and end of input; web must show errors in the status line.

## 5. Web UI rules

- Keyboard accessible (native `<button>`s, visible focus), responsive, with an `aria-live` status line.
- Block input while the computer is "thinking"; changing mode or resetting cancels a pending computer move.
- Highlight the winning line; disable occupied cells and the whole board when the game is over.
- Out of scope: online multiplayer, accounts, adaptive difficulty. (The three fixed computer levels were added later, see [tic-tac-toe-difficult.md](../design/tic-tac-toe-difficult.md).)
- Scores panel sits directly above the board; Pause/Resume, New game and Reset scores are native buttons. Confirm before discarding a saved paused game or resetting scores. The game must stay playable when storage is unavailable (blocked `localStorage` or no API: Pause and scores disabled with a visible note).

## 6. Testing

- Every behavior change needs tests; core logic is tested independently of any UI.
- Use descriptive test names, group with `describe()`, and do not depend on test execution order.
- Test public behavior, not private implementation details.
- Core coverage: initial state, valid/invalid moves, all 8 winning lines for both players, draws, and immutability.
- Web controller tests use fake timers and a fake storage instead of a real DOM or server. The `localStorage` client is tested with an in-memory `Storage` fake. Store and server tests use a temporary directory and never touch the real `data/` folder.

## 7. Commands

| Command | Purpose |
|---|---|
| `npm run play` / `npm start` / `npm run dev` | Run the console game (uses `data/game-data.json`) |
| `npm run server` | Start the scores/pause API on `127.0.0.1:3001` (`PORT`, `GAME_DATA_FILE`) |
| `npm run dev:web` | Start the web dev server (browser storage, no server needed) |
| `npm run dev:web:api` | Web dev server using the API server (proxies `/api`) |
| `npm run build:web` | Hosted production build (browser storage), as deployed to GitHub Pages |
| `npm run build:web:api` | Production build that talks to the API server |
| `npm run start:web` | Build in API mode, then serve the app and API from one server |
| `npm run preview:web` | Serve the production build locally |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | `vitest run` |

## 8. Definition of done

A change is complete only when:

- [ ] `npm run typecheck` passes.
- [ ] `npm test` passes.
- [ ] `npm run build:web` passes for web-related changes.
- [ ] The console game still runs and the web game still plays.
- [ ] No unnecessary dependencies or `any` types were added.
- [ ] Related documentation is updated.

## 9. Workflow

- Inspect existing code before changing it; reuse existing files and dependencies.
- Make surgical changes; do not fix unrelated issues.
- Implement real code, not just snippets.
- Commits: use the `commit-message` skill (imperative subject ≤ 72 chars, explanatory body, `Co-authored-by` trailer). One logical change per commit. Never commit secrets, `node_modules/` or build output. Do not push unless asked.
