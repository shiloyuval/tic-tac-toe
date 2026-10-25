# Tic-Tac-Toe

Tic-Tac-Toe in TypeScript, playable in the console or in the browser, against another person or against a computer with three difficulty levels. Scores and a paused game are saved between sessions.

## Requirements

Node.js and npm.

```
npm install
```

## Play in the console

```
npm run play
```

- Choose a mode, then enter a position `0–8` to play. Enter `p` to pause: the game is saved and the program exits.
- On the next start, a paused game is offered for resuming.
- Scores (Player 1 = X, Player 2 = O, draws) are shown at the start and the end of a game.

## Play in the browser

Hosted version: **https://shiloyuval.github.io/tic-tac-toe/** (after the one-time GitHub Pages setup below).

```
npm run dev:web     # Vite dev server, no other server needed
```

In the browser the scores and a paused game are kept in the browser's `localStorage`, per browser and device. They are not shared with other visitors or with the console game. If the browser blocks storage, the game is still playable but scores and pause are unavailable.

To share the scores and the paused game with the console game instead, use the server-backed mode, which keeps them in `data/game-data.json`:

```
npm run server        # API on http://127.0.0.1:3001
npm run dev:web:api   # Vite dev server using the API (proxies /api)
npm run start:web     # or: build in API mode and serve everything on http://127.0.0.1:3001
```

- The scores are shown above the board. **Pause** saves the game; after a reload or restart it is loaded in a paused state and you can **Resume** or start a **New game**.
- **Reset scores** clears the scoreboard.

## Computer difficulty

When you play against the computer (you are X, it is O) you choose a level:

| Level | Behavior |
|---|---|
| Easy | Plays a random free cell. |
| Medium (default) | Wins or blocks when it can, otherwise plays randomly. Beatable with a fork. |
| Hard | Perfect play (minimax). It never loses. |

In the console you are asked for the level after choosing the computer mode. In the browser the level selector appears next to the mode selector; changing the level starts a new game. A paused game resumes at the same level. See [tic-tac-toe-difficult.md](./design/tic-tac-toe-difficult.md).

## Publish on GitHub Pages

The workflow [.github/workflows/deploy.yml](./.github/workflows/deploy.yml) runs the type check and the tests on every push to `main`, builds the hosted version (`npm run build:web`) and deploys it to GitHub Pages. A failing check blocks the deployment.

One-time setup: in the repository open **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**. Then push to `main` (or run the workflow manually from the **Actions** tab). The build uses relative asset paths, so it also works on other static hosts such as Cloudflare Pages or Netlify (build command `npm run build:web`, output folder `dist`).

## Scores and saved games

- Only finished two-player games are scored. Games against the computer are not.
- Console and server mode: data is stored in `data/game-data.json` (gitignored). Set `GAME_DATA_FILE` to use another file and `PORT` to change the server port. A corrupt data file is moved aside as `game-data.json.corrupt-<timestamp>` and a fresh one is started.
- Hosted mode: data is stored in `localStorage` under the key `tic-tac-toe:game-data`; an unreadable value is kept under `tic-tac-toe:game-data:corrupt` and a fresh one is started.

## Development

| Command | Purpose |
|---|---|
| `npm test` | Run the tests (Vitest) |
| `npm run typecheck` | Type-check the project |
| `npm run build:web` | Build the web app into `dist/` |

## Project structure

```
src/game.ts, computer.ts, mode.ts   Game rules, computer opponent (Easy/Medium/Hard), shared mode types (pure)
src/storage/                        Scores/paused-game model (pure) and JSON file store
src/server/                         Small HTTP API for the browser
src/cli.ts, index.ts                Console UI and entry point
src/web/                            Browser UI (controller, view, localStorage and API storage)
tests/                              Vitest tests
.github/workflows/deploy.yml        Test, build and deploy to GitHub Pages
```

More detail: [tic-tac-toe.md](./design/tic-tac-toe.md), [tic-tac-toe-web.md](./design/tic-tac-toe-web.md), [tic-tac-toe-persistent.md](./design/tic-tac-toe-persistent.md), [tic-tac-toe-github.md](./design/tic-tac-toe-github.md), [tic-tac-toe-difficult.md](./design/tic-tac-toe-difficult.md) and the project rules in [.github/copilot-instructions.md](./.github/copilot-instructions.md).
