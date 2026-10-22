# Project Rules — Tic-Tac-Toe

These rules apply to all work in this repository. Detailed specs: [tic-tac-toe.md](../tic-tac-toe.md) (core game and CLI) and [tic-tac-toe-web.md](../tic-tac-toe-web.md) (web version).

## 1. Technology

- TypeScript (strict), ES modules, Node.js, npm.
- Tests: Vitest. Dev runner: `tsx`. Web bundler/dev server: Vite.
- The web frontend is vanilla TypeScript + HTML + CSS. No frontend framework, no database, no backend.
- Add a dependency only when the task requires it. Avoid unnecessary abstractions.
- Never use `any` without a documented, compelling reason.
- `tsconfig.json` must keep `strict` and `noUncheckedIndexedAccess` enabled.

## 2. Architecture

```
src/game.ts       Core rules and state (pure, no Node/browser APIs)
src/computer.ts   Minimax computer opponent (pure)
src/mode.ts       Shared GameMode type and COMPUTER_PLAYER constant
src/cli.ts        Console UI (Node only)
src/index.ts      Console entry point and top-level error handling
src/web/          Browser UI: controller.ts (DOM-free flow), view.ts (rendering), main.ts (wiring), styles.css
index.html        Vite entry
tests/            Vitest tests (tests/web for the web controller)
```

- All game rules live in `game.ts`. UIs must not detect winners, validate moves, or modify the board themselves.
- Never duplicate winner-detection logic; use `checkWinner()` / `getWinningLine()`.
- `game.ts`, `computer.ts` and `mode.ts` must not import Node or browser APIs.
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
- Vs-computer mode: the human is X, the computer is O. The computer must never lose.

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
- Out of scope: online multiplayer, accounts, persistence, difficulty levels.

## 6. Testing

- Every behavior change needs tests; core logic is tested independently of any UI.
- Use descriptive test names, group with `describe()`, and do not depend on test execution order.
- Test public behavior, not private implementation details.
- Core coverage: initial state, valid/invalid moves, all 8 winning lines for both players, draws, and immutability.
- Web controller tests use fake timers instead of a real DOM.

## 7. Commands

| Command | Purpose |
|---|---|
| `npm run play` / `npm start` / `npm run dev` | Run the console game |
| `npm run dev:web` | Start the web dev server |
| `npm run build:web` | Production build of the web app |
| `npm run preview:web` | Serve the production build |
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
