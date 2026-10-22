# Tic-Tac-Toe

Tic-Tac-Toe in TypeScript, playable in the console or in the browser, against another person or against an unbeatable computer. Scores and a paused game are saved between sessions.

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

Development (two terminals):

```
npm run server      # API on http://127.0.0.1:3001
npm run dev:web     # Vite dev server, proxies /api to the API
```

Production-style (one command, serves the built app and the API):

```
npm run start:web   # http://127.0.0.1:3001
```

- The scores are shown above the board. **Pause** saves the game; after a reload or restart it is loaded in a paused state and you can **Resume** or start a **New game**.
- **Reset scores** clears the scoreboard.
- If the server is not running, the game is still playable, but scores and pause are unavailable.

## Scores and saved games

- Only finished two-player games are scored. Games against the computer are not.
- Data is stored in `data/game-data.json` (gitignored). Set `GAME_DATA_FILE` to use another file and `PORT` to change the server port.
- A corrupt data file is moved aside as `game-data.json.corrupt-<timestamp>` and a fresh one is started.

## Development

| Command | Purpose |
|---|---|
| `npm test` | Run the tests (Vitest) |
| `npm run typecheck` | Type-check the project |
| `npm run build:web` | Build the web app into `dist/` |

## Project structure

```
src/game.ts, computer.ts, mode.ts   Game rules, minimax opponent, shared mode types (pure)
src/storage/                        Scores/paused-game model (pure) and JSON file store
src/server/                         Small HTTP API for the browser
src/cli.ts, index.ts                Console UI and entry point
src/web/                            Browser UI (controller, view, API client)
tests/                              Vitest tests
```

More detail: [tic-tac-toe.md](./tic-tac-toe.md), [tic-tac-toe-web.md](./tic-tac-toe-web.md), [tic-tac-toe-persistent.md](./tic-tac-toe-persistent.md) and the project rules in [.github/copilot-instructions.md](./.github/copilot-instructions.md).
