# Tic-Tac-Toe Persistence — Mission File

## Related plans

- Hosting and browser storage: [tic-tac-toe-github.md](./tic-tac-toe-github.md). The web build now keeps scores in `localStorage`; the Node server described here is used by the console game and by `--mode api` builds.

## 1. Mission

Add persistent storage to the game so that:

1. **Scores** (Player 1 wins, Player 2 wins, draws) survive restarts.
2. A game can be **paused**; the paused game is **saved** and **loaded the next time the application starts**.
3. The **results are shown on the page above the board** (web), and printed at start and end of a game (console).

Game rules, the computer opponent and the existing UIs keep working; persistence is added around them.

## 2. Product rules

- **Only two identities exist: Player 1 and Player 2.** No accounts, names or profiles. Player 1 plays X (and starts), Player 2 plays O.
- **One scoreboard:** `player1Wins`, `player2Wins`, `draws`. A game is recorded only when it finishes, exactly once.
- **Only "two players" games are recorded.** Games against the computer never change the scores. The scoreboard is still shown above the board in both modes.
- **Pause:** allowed only while a game is in progress, in either mode. Pausing saves the full game (board, whose turn, mode) and stops play until the user resumes. A paused vs-computer game resumes as a vs-computer game and is still not scored when it finishes.
- **One paused game at a time.** Pausing again overwrites the saved game.
- **On application start:** if a paused game exists it is loaded and shown as paused; the user chooses **Resume** or **New game**. Nothing is saved automatically unless the user pauses (closing the tab or quitting does not save).
- **Discarding:** starting a new game, changing mode, or finishing the loaded game removes the saved paused game. Discarding a paused game asks for confirmation.
- **Resetting scores** is an explicit action with confirmation. It never touches the paused game.
- **Results above the board:** `Player 1 (X): N · Player 2 (O): N · Draws: N`, always visible on the page.

## 3. Decision: filesystem, not a database

**Use a single JSON file on disk.**

- The data is tiny: three counters and at most one saved game. No relations, no queries, one local writer.
- A database (SQLite, Postgres, …) would add a dependency, a schema and migrations for no gain; the project rules say to avoid unnecessary dependencies. A JSON file is not a database, so the "no database" rule stays accurate.
- Node's built-in `node:fs/promises` is enough; **no new packages**.
- **Scores and the paused game live in the same file**, so finishing a game can record the result and clear the paused game in one atomic write (no state where the score is counted but the old paused game remains, or the reverse).
- A browser cannot write to disk, so the web version needs a small Node server built on `node:http`. The console game uses the same store directly, so both versions see the same scores and the same paused game.
- Upgrade path: file access sits behind one `GameStore` interface and can later be replaced (for example by SQLite) without touching the UIs.

Rejected: `localStorage` for the web. It would not be shared with the console game and is not the filesystem or database storage that was requested.

## 4. Architecture

```
data/
  game-data.json          # created on first write; gitignored
src/
  game.ts, computer.ts, mode.ts   # unchanged, stay pure
  storage/
    model.ts              # pure: types, empty data, outcome mapping, recordOutcome(), parse/validate (no I/O)
    gameStore.ts          # Node-only file store with atomic writes
  server/
    server.ts             # node:http API (+ static serving of dist/ in production)
    index.ts              # server entry point
  cli.ts                  # shows scores, supports pause/resume through gameStore
  web/
    apiClient.ts          # fetch() wrapper for the API
    controller.ts, view.ts, main.ts   # scores panel, pause/resume, saving
tests/
  storage/model.test.ts
  storage/gameStore.test.ts
  server/server.test.ts
  web/controller.test.ts  # extended
```

Layering rules:

- `src/storage/model.ts` is pure like `game.ts` (no Node or browser APIs), so the CLI, server and web share its types.
- `gameStore.ts` and `src/server/*` are Node-only and are never imported from `src/web/*`. The web talks to the store only over HTTP.
- `game.ts` and `computer.ts` stay unchanged and know nothing about persistence. The model reuses `checkWinner()` / `isBoardFull()` for validation instead of duplicating rules.

## 5. Data model

```typescript
export interface Scores {
  player1Wins: number; // Player 1 plays X
  player2Wins: number; // Player 2 plays O
  draws: number;
}

export interface PausedGame {
  state: GameState;
  mode: GameMode;
  pausedAt: string; // ISO timestamp
}

export interface GameData {
  version: 1;
  scores: Scores;
  pausedGame: PausedGame | null;
}

export type Outcome = "player1-win" | "player2-win" | "draw";
```

File format (`data/game-data.json`):

```json
{
  "version": 1,
  "scores": { "player1Wins": 0, "player2Wins": 0, "draws": 0 },
  "pausedGame": null
}
```

- `outcomeOf(state)` maps a finished `GameState` to an `Outcome` (`won` + winner `X` → `player1-win`, `O` → `player2-win`, `draw` → `draw`); returns `null` while in progress.
- Whether a finished game is scored is decided in one place: `shouldRecord(mode)` in `model.ts` returns `true` only for `"two-players"`. The CLI and the web controller both use it, so the rule is not duplicated.
- `version` allows future migrations.

## 6. Steps

### Step 1 — Update the project rules
The current rules say "no database, no backend". Before coding, update `.github/copilot-instructions.md` and `tic-tac-toe.md`: allow the Node server and JSON store, add the layering rules from section 4, the Player 1 / Player 2 rule, and the new commands.

### Step 2 — Data model (`src/storage/model.ts`)
- Types from section 5, `createEmptyGameData()`, `outcomeOf()`.
- `shouldRecord(mode)` — `true` only for `"two-players"`.
- `recordOutcome(data, outcome)` — immutable; also sets `pausedGame` to `null`.
- `clearPausedGame(data)` — used when a finished computer game must remove its saved game without touching the scores.
- `pauseGame(data, state, mode, now)` — only accepts an in-progress state.
- `parseGameData(unknown)` — validates the whole file without `any`:
  - counters are non-negative integers; unknown `version` is rejected;
  - a paused game is accepted only if it is **consistent**: 9 cells with `"X" | "O" | null`, X count equals O count or O count + 1, `currentPlayer` matches those counts, `checkWinner()` is `null`, the board is not full, `status` is `"in-progress"` and `winner` is `null`, mode is a known mode;
  - an invalid paused game is dropped (scores are kept); an invalid file is rejected as a whole.

### Step 3 — File store (`src/storage/gameStore.ts`)
- `createGameStore(filePath)` returns:
  - `load(): Promise<GameData>`
  - `finishGame(outcome): Promise<GameData>` — records the result and clears the paused game in one write (two-player games only)
  - `pauseGame(state, mode): Promise<GameData>`
  - `discardPausedGame(): Promise<GameData>`
  - `resetScores(): Promise<GameData>`
- Default path `data/game-data.json`, overridable with `GAME_DATA_FILE` (used by tests).
- Missing file → empty data. Corrupt or invalid file → copy it to `game-data.json.corrupt-<timestamp>`, log a warning, continue with empty data; never crash.
- Create `data/` on first write. Writes are atomic (temp file in the same directory, then `rename`).
- Serialize all operations through a promise queue so quick consecutive calls cannot lose an update.

### Step 4 — HTTP API (`src/server`)
Built on `node:http`, no new dependencies.

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/state` | – | `GameData` (scores + paused game, loaded at page start) |
| POST | `/api/finish` | `{ "outcome": Outcome }` | updated `GameData` |
| PUT | `/api/paused-game` | `{ "state": GameState, "mode": GameMode }` | updated `GameData` |
| DELETE | `/api/paused-game` | – | updated `GameData` |
| DELETE | `/api/scores` | – | updated `GameData` |

- The server validates every body with the model's parsing (the paused game must pass the consistency checks); limit body size (e.g. 4 KB).
- Status codes: `400` bad input, `404` unknown path, `405` wrong method, `413` body too large, `500` with a generic message (no stack traces or file paths).
- Bind to `127.0.0.1` by default; port from `PORT` (default `3001`). In production also serve the built `dist/`.

### Step 5 — Console integration (`src/cli.ts`)
- On start: load the data, print the scores. If a paused game exists, print the board and ask `Resume the paused game? (y/n)`; `y` restores state and mode, `n` discards it (after confirmation).
- During a game the prompt accepts `p` (or `pause`) in addition to positions `0–8`: save the game, print "Game paused and saved", and exit cleanly.
- When a game ends: if `shouldRecord(mode)`, derive the outcome with `outcomeOf`, call `finishGame` once, and print the updated scores. A finished vs-computer game is not recorded; the scores are printed unchanged.
- Input ending mid-game does **not** save or record anything.
- Storage failures print a short warning and the game continues (pause then reports "could not save").

### Step 6 — Web integration (`src/web`)
- `apiClient.ts`: `loadState()`, `finish(outcome)`, `pause(state, mode)`, `discardPaused()`, `resetScores()`.
- **Layout (`index.html`):** title → **scores panel** → mode selector → board → status → buttons (`Pause` / `Resume`, `New game`, `Reset scores`). The scores panel sits directly above the board and is an `aria-live="polite"` region.
- **Controller (stays DOM-free, client injected for tests):**
  - on startup `loadState()`; if there is a paused game, restore its state and mode in a **paused** state (board visible and locked, status "Game paused");
  - `pause()`: allowed only in progress; cancels a pending computer move, saves via the API, locks the board;
  - `resume()`: unlocks; if it is the computer's turn, schedules the computer move again; the saved paused game is deleted on resume so a stale save is never loaded later;
  - when a move ends the game in **two-players** mode, call `finish(outcome)` exactly once (guard against double clicks, resets and mode changes during the request) and update scores from the response; in vs-computer mode do not call it (just discard any saved paused game);
  - `New game`, mode change: discard the saved paused game (with confirmation when one exists);
  - expose `scores`, `paused` and `persistenceAvailable` through the `ViewModel`.
- **View:** renders the scores panel text, toggles Pause/Resume, disables Pause when the game is not in progress. No game rules in the view.
- **API unavailable:** the game stays fully playable; scores show "Scores unavailable" and Pause is disabled with an explanatory message.
- Keyboard accessible, readable at mobile width, light and dark mode.

### Step 7 — Tooling
- Add scripts: `server` (`tsx src/server/index.ts`) and `start:web` (build, then serve `dist/` with the API).
- Vite dev proxy: `/api` → `http://127.0.0.1:3001`; run `npm run server` next to `npm run dev:web` (two terminals; add `concurrently` only if the user wants one command).
- Add `data/` to `.gitignore`.
- Keep `tsconfig.json` typechecking both Node and DOM code.

### Step 8 — Tests
- `model.test.ts` (pure): `outcomeOf` for X win, O win, draw, in progress; `shouldRecord` is true only for two-players; `recordOutcome` increments the right counter, is immutable and clears the paused game; `pauseGame` rejects finished games; `parseGameData` rejects negative or non-integer counters, bad boards, wrong X/O counts, wrong `currentPlayer`, already-won or full boards, unknown mode or version.
- `gameStore.test.ts` (temp directory per test): missing file; pause then reload returns the same game; finish updates scores and clears the paused game atomically; discard; reset scores keeps the paused game; corrupt file → backup and empty data; no temp file left behind; concurrent calls do not lose updates.
- `server.test.ts` (port `0` with a temp store): every endpoint, invalid or inconsistent paused game (`400`), wrong method, unknown path, oversize body.
- Extend `tests/web/controller.test.ts` with a fake API client: loads a paused game at start in paused state; pause saves and cancels a pending computer move; resume continues, including the computer's turn; finish recorded once in two-players mode and never in vs-computer mode; unfinished and reset games not recorded; API failure keeps the game playable.
- Existing tests keep passing; tests never touch the real `data/` folder.

### Step 9 — Manual verification
- Console: play some moves, `p` to pause, restart and resume the same board; finish a game and confirm scores persist and the paused game is gone; corrupt the file and confirm warning plus backup.
- Web: play a few moves, press Pause, reload the page and restart the server; confirm the paused board and the scores above it are loaded and Resume continues; test a vs-computer game paused on the computer's turn and confirm that finishing it leaves the scores unchanged; stop the server and confirm the game still works with "Scores unavailable".
- Console and web show the same totals and the same paused game.

### Step 10 — Docs
Update `README.md` (create it if missing), `tic-tac-toe-web.md` and `.github/copilot-instructions.md`: new commands, data file location and environment variables, the API table, how pause/resume works in the console and web, and how to reset scores.

## 7. Acceptance criteria

- [ ] The scores for Player 1, Player 2 and draws are shown above the board and persist across restarts of the browser, the server and the console game.
- [ ] A game can be paused only while in progress; the saved game (board, turn, mode) is loaded on the next start and can be resumed or discarded.
- [ ] A finished two-player game is recorded exactly once and removes any saved paused game in the same write; finished vs-computer games never change the scores.
- [ ] Paused-game files are validated; corrupt or inconsistent data never crashes the app and is backed up or dropped.
- [ ] Writes are atomic and concurrent updates are not lost.
- [ ] The game stays playable when storage or the API fails.
- [ ] `game.ts` and `computer.ts` are unchanged; `src/web` imports no Node-only modules; no new runtime dependency; the server listens on localhost by default.
- [ ] `npm run typecheck`, `npm test` and `npm run build:web` pass, and `data/` is gitignored.

## 8. Out of scope

Player names, accounts or profiles; alternating who starts; several simultaneous saved games; auto-saving on tab close or quit; game history or replays; leaderboards across machines; cloud sync; a real database; migrations beyond the `version` field.
