# Tic-Tac-Toe Difficulty — Mission File

## 1. Mission

Let the player choose how strong the computer opponent is: **Easy**, **Medium** or **Hard**. The computer was first unbeatable (minimax), then made trivially weak (always the first free cell). Neither is fun, so both extremes are kept as levels and a middle level is added. Console and web must both support it.

## 2. Levels

| Level | Strategy | Beatable? |
|---|---|---|
| Easy | Picks a random free cell. | Yes, easily. |
| Medium (default) | Takes a winning move if it has one, otherwise blocks the human's winning move, otherwise picks a random free cell. | Yes, with a fork (two threats at once). |
| Hard | Minimax, as before: faster wins and slower losses score better. | No. It never loses. |

Decisions:

- Human is X, computer is O, in every level.
- Randomness is injectable (`random: () => number`, default `Math.random`) so tests are deterministic.
- Hard stays deterministic (first best move).
- Out of scope: per-move difficulty changes, adaptive difficulty, scores per level. Games against the computer are still never scored.

## 3. Design

| Concern | File | Change |
|---|---|---|
| `Difficulty` type, `DIFFICULTIES`, `DEFAULT_DIFFICULTY` (`"medium"`) | `src/mode.ts` | New shared type and constants (pure). |
| Strategies | `src/computer.ts` | `chooseComputerMove(state, difficulty = DEFAULT_DIFFICULTY, random = Math.random)`. Reuse `makeMove`/`getGameResult` helpers; win/block detection is done by simulating `makeMove` (no duplicated winner logic). |
| Turn flow, state | `src/web/controller.ts` | Holds `difficulty`; `setDifficulty()` starts a new game and cancels a pending computer move (like `setMode`). `ViewModel.difficulty`. Optional `random` in `ControllerOptions` for tests. |
| Rendering | `src/web/view.ts`, `index.html`, `src/web/styles.css` | A "Difficulty" radio group (native inputs, labelled), visible only in Vs computer mode. |
| Wiring | `src/web/main.ts` | Change handler, confirm before discarding a saved paused game (same as mode change). |
| Console | `src/cli.ts` | After choosing "Play against the computer", ask for the level (1 Easy, 2 Medium, 3 Hard). |
| Saved games | `src/storage/model.ts`, `gameStore.ts`, `server/server.ts`, `web/gameStorage.ts`, `apiClient.ts`, `localStorageClient.ts` | A paused game also stores its `difficulty`, so Resume continues at the same level. Saved data is still validated; a missing or invalid value falls back to the default, so old saves keep loading. `pause(state, mode, difficulty)`. |

## 4. Steps

1. Add `Difficulty` to `src/mode.ts`.
2. Implement the three strategies in `src/computer.ts`; keep it pure and immutable.
3. Persist the level in paused games (model, store, server, storage clients) with backward-compatible parsing.
4. Controller: state, `setDifficulty`, `random` option, pass the level to `chooseComputerMove`, include it in `pause()` and restore it in `init()`.
5. Web UI: markup, view rendering, event wiring, styles.
6. CLI: level prompt and resumed-game level.
7. Tests (see below).
8. Docs: README, project rules (the "intentionally beatable" and "no difficulty levels" lines), `tic-tac-toe-web.md` out-of-scope list, `index.html` description.
9. Run `verify-changes` and `manual-web-check`.

## 5. Tests

- `tests/computer.test.ts`
  - Easy: returns an empty cell; follows the injected random source; never throws on a nearly full board.
  - Medium: takes an immediate win; blocks an immediate loss; prefers winning over blocking; otherwise uses the random source; can be beaten (a scripted fork wins for X).
  - Hard: takes a win, blocks, and never loses against every possible human strategy.
  - Rejects finished games; does not mutate the state; default level is Medium.
- `tests/storage/model.test.ts`: `pauseGame` stores the level; missing/invalid level falls back to the default; `parsePauseRequest` accepts and rejects levels.
- Store, server and `localStorage` client tests: the level round-trips through pause and load.
- `tests/web/controller.test.ts` (fake timers, no DOM): default level is Medium; `setDifficulty` resets the game and cancels a pending computer move; the chosen level is used (Easy with a fixed random source vs. Hard); pause saves the level and a loaded paused game restores it; a human can beat the Easy computer and cannot beat the Hard computer.

## 6. Acceptance criteria

- [ ] The web UI shows Easy / Medium / Hard only in Vs computer mode; Medium is selected by default.
- [ ] Changing the level mid-game starts a new game (after confirmation when a saved paused game exists).
- [ ] The console asks for the level when playing against the computer.
- [ ] Hard never loses; Easy and Medium can be beaten.
- [ ] A paused computer game resumes at the same level, in the console and in the browser.
- [ ] Old saved data without a level still loads.
- [ ] Games against the computer are still not scored.
- [ ] `npm run typecheck`, `npm test` and `npm run build:web` pass; docs are updated.
