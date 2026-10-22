# Tic-Tac-Toe on GitHub Pages — Mission File

## 1. Mission

Publish the web game for free on **GitHub Pages** so anyone can play it at `https://shiloyuval.github.io/tic-tac-toe/`, deployed automatically from the `main` branch.

GitHub Pages serves static files only, so the Node server cannot run there. The hosted game keeps the scores and the paused game **in each visitor's browser** (`localStorage`). The server-backed mode stays available for local use, where it shares data with the console game.

## 2. Decisions

- **Host:** GitHub Pages with a GitHub Actions workflow (no extra account; the repo is already on GitHub). Cloudflare Pages or Netlify would work with the same build output.
- **Storage in the hosted build:** `localStorage`. Each visitor gets their own scores and paused game on their own device. No accounts, no backend, no cost.
- **Same logic, new storage:** the controller already talks to storage through a small interface. The browser storage implements the same interface and reuses the pure model (`src/storage/model.ts`), so scoring rules, validation of saved games and "only two-player games are scored" are not duplicated.
- **Choosing the storage:** at build time through the Vite *mode*.
  - default mode → browser storage (what GitHub Pages deploys, and what `npm run dev:web` uses, no server needed);
  - `--mode api` → the existing HTTP API and Node server (shared with the console game).
- **Relative asset paths** (`base: "./"`): the same build works under `/tic-tac-toe/` on GitHub Pages, at the root of another host, and when served by the local Node server.
- **Rules that stay:** Player 1 = X, Player 2 = O; only finished two-player games are scored; a paused game is validated when loaded; storage failures never stop the game from being played.
- **Limitation (accepted):** scores and a paused game do not follow a player across browsers or devices, and the console game does not see them. Shared leaderboards or online play would need a real backend and are out of scope.

## 3. Architecture changes

```
src/web/
  gameStorage.ts         # NEW: GameStorage interface (loadState, finish, pause, discardPaused, resetScores)
  localStorageClient.ts  # NEW: localStorage implementation + getBrowserStorage()
  apiClient.ts           # now returns GameStorage (HTTP implementation, unchanged behavior)
  controller.ts          # option `api` renamed to `storage`
  main.ts                # picks the storage from the Vite mode
.github/workflows/deploy.yml   # NEW: test, build and deploy to GitHub Pages
vite.config.ts                 # base: "./"
```

- `localStorageClient.ts` imports only the pure model and the browser `Storage` type: no Node modules.
- `src/server`, `gameStore.ts` and the console game are unchanged.

## 4. Steps

### Step 1 — Make a clean install possible (`package.json`)
The CI runner is Linux and uses `npm ci`. Today `package.json` has a large `dependencies` block of transitive packages (chai, esbuild, rolldown, …, including the Windows-only `lightningcss-win32-x64-msvc`) that is **not** in `package-lock.json`. `npm ci` would refuse the out-of-sync lock file, and the Windows-only package would fail on Linux.
- Remove that block, keep `vite` as a direct dev dependency (the build and `vite.config.ts` use it), then regenerate the lock file with `npm install`.
- Verify typecheck, tests and build still pass and that `npm ci` succeeds in a clean copy.

### Step 2 — Storage interface (`gameStorage.ts`)
Move the interface out of `apiClient.ts` and name it `GameStorage`; rename the controller option `api` → `storage` (and the tests accordingly) so the code is not misleading now that there are two implementations.

### Step 3 — Browser storage (`localStorageClient.ts`)
- `createLocalStorageClient(storage: Storage): GameStorage` using one key, `tic-tac-toe:game-data`, holding the same `GameData` JSON as the file store.
- Every operation reads the latest value, applies a pure model function (`recordOutcome`, `pauseGame`, `clearPausedGame`, `resetScores`) and writes back, so two open tabs cannot overwrite each other with stale data.
- Missing value → empty data. Corrupt value → keep a copy under `tic-tac-toe:game-data:corrupt`, start fresh. An invalid paused game is dropped by `parseGameData` while the scores are kept.
- Write errors (quota, blocked storage) reject, and the controller already reports them without breaking the game.
- `getBrowserStorage()` returns `window.localStorage` after a write/remove probe, or `null` when storage is blocked (private mode, disabled cookies). `null` → the game runs with scores and pause shown as unavailable.

### Step 4 — Wiring (`main.ts`, `view.ts`)
- `import.meta.env.MODE === "api"` → `createApiClient()`; otherwise `createLocalStorageClient(getBrowserStorage())` (or `null`).
- Reword the "unavailable" note so it is correct for both storages.

### Step 5 — Build configuration
- `vite.config.ts`: `base: "./"` (keeps the `/api` dev proxy).
- Scripts:
  - `dev:web` → local storage mode, no server needed;
  - `dev:web:api` → `vite --mode api` (use with `npm run server`);
  - `build:web` → hosted build (local storage);
  - `build:web:api` → `vite build --mode api`;
  - `start:web` → `vite build --mode api && tsx src/server/index.ts`.
- Add a small SVG favicon and a meta description to `index.html`.

### Step 6 — Deployment workflow (`.github/workflows/deploy.yml`)
- Triggers: push to `main` and manual `workflow_dispatch`.
- Permissions: `contents: read`, `pages: write`, `id-token: write`; concurrency group `pages` (no overlapping deploys).
- **build job:** checkout → setup-node 24 with npm cache → `npm ci` → `npm run typecheck` → `npm test` → `npm run build:web` → `configure-pages` → `upload-pages-artifact` (`dist`).
- **deploy job:** `deploy-pages`, environment `github-pages`, so a broken test or type error blocks the deployment.

### Step 7 — Tests
- `tests/web/localStorageClient.test.ts` with an in-memory `Storage` fake:
  - empty load; pause then load in a new client; finish records and clears the paused game; discard; reset keeps the paused game;
  - corrupt JSON → fresh data plus a backup copy; invalid paused game dropped, scores kept;
  - write failure rejects; two clients on the same storage see each other's changes (no stale overwrite).
- Existing tests keep passing (controller tests updated for the `storage` option).

### Step 8 — Verification
- `npm run typecheck`, `npm test`, `npm run build:web`; check `dist/index.html` uses relative asset paths.
- Serve `dist` from a `/tic-tac-toe/` sub-folder and play in a browser: score recorded and persisted after reload, pause then reload then resume, reset scores, vs-computer not scored, blocked storage shows the "unavailable" note and the game still works.
- Confirm `npm run start:web` (api mode) still works with the server.

### Step 9 — Docs
Update `README.md` (live URL, hosted vs local modes, scripts), `.github/copilot-instructions.md` (architecture, commands, storage rule) and `tic-tac-toe-persistent.md` (pointer to this file).

### Step 10 — One-time GitHub settings (manual)
After pushing, in the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**. The first workflow run then publishes the site; later pushes to `main` redeploy automatically.

## 5. Acceptance criteria

- [ ] A push to `main` runs typecheck and tests and then deploys the game to GitHub Pages; a failure blocks the deployment.
- [ ] The published game works under `https://shiloyuval.github.io/tic-tac-toe/`: two players, vs computer, pause/resume, scores above the board.
- [ ] Scores and the paused game persist per browser across reloads and are never shared between visitors.
- [ ] Blocked or full browser storage never breaks the game; saved data is validated on load.
- [ ] `npm ci` works on a clean checkout (Linux CI), and no Windows-only package is a direct dependency.
- [ ] The server-backed mode (`npm run start:web`, `dev:web:api`) and the console game still work.
- [ ] `game.ts`, `computer.ts`, `storage/model.ts`, the server and the file store are unchanged in behavior.
- [ ] `npm run typecheck`, `npm test` and `npm run build:web` pass.

## 6. Out of scope

Custom domain, analytics, accounts, cross-device sync, shared leaderboards, online multiplayer, and a service worker or offline install (PWA).
