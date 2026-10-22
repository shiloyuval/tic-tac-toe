# Tic-Tac-Toe — Agent Implementation Guide

## 1. Objective

Implement a complete, playable Tic-Tac-Toe game using TypeScript.

The implementation must be simple, readable, type-safe, modular, and easy to test. Follow the requirements in this document instead of making assumptions about game rules or behavior.

**Default implementation target:** A command-line application running on Node.js. Keep the game logic independent of the command-line interface so it can later be reused in a web application.

## 2. Technology and constraints

- Language: TypeScript.
- Runtime: Node.js.
- Module system: ES modules.
- Package manager: npm.
- Testing: Vitest.
- Do not use `any` unless there is a documented, compelling reason.
- Do not introduce a frontend framework or database.
- Separate game logic, user interaction, and application startup.
- Use small, focused functions with clear names.
- Avoid unnecessary abstractions and dependencies.

## 3. Game rules

Tic-Tac-Toe is played on a 3 × 3 board by two players.

- Player X starts the game.
- Player O plays second.
- Players alternate turns.
- A player selects an empty cell to place their symbol.
- A player wins by placing three matching symbols in a horizontal row, vertical column, or diagonal.
- If all nine cells are occupied and nobody has won, the game ends in a draw.
- A player cannot place a symbol in an occupied cell.
- No moves are allowed after the game has ended.
- The game must never declare a winner before a valid winning combination exists.

## 4. Project structure

Create the following files:

```text
tic-tac-toe/
├── src/
│   ├── game.ts       # Core game rules and state
│   ├── cli.ts        # Command-line interface
│   └── index.ts      # Application entry point
├── tests/
│   └── game.test.ts  # Unit tests for game logic
├── package.json
├── tsconfig.json
└── tic-tac-toe.md    # This implementation guide
```

Keep all game rules inside `game.ts`. The CLI must not implement its own winner detection or modify the board directly.

## 5. Data model

Represent the board as a fixed-size array of nine cells.

Use these types or equivalent type-safe definitions:

```typescript
export type Player = "X" | "O";

export type Cell = Player | null;

export type Board = [
  Cell, Cell, Cell,
  Cell, Cell, Cell,
  Cell, Cell, Cell
];

export type GameStatus =
  | "in-progress"
  | "won"
  | "draw";

export interface GameState {
  board: Board;
  currentPlayer: Player;
  status: GameStatus;
  winner: Player | null;
}
```

The board uses zero-based indexing:

```text
 0 | 1 | 2
---+---+---
 3 | 4 | 5
---+---+---
 6 | 7 | 8
```

For example, selecting position `4` places a symbol in the center cell.

Use `null` to represent an empty cell.

## 6. Core game API

Implement the following functions in `src/game.ts`.

### 6.1 `createGame()`

Signature:

```typescript
export function createGame(): GameState;
```

Requirements:

- Initialize all nine cells to `null`.
- Set the current player to `"X"`.
- Set the status to `"in-progress"`.
- Set the winner to `null`.
- Return a new game state on every invocation.

### 6.2 `makeMove()`

Signature:

```typescript
export function makeMove(
  state: GameState,
  position: number
): GameState;
```

Requirements:

1. Reject moves if the game is already finished.
2. Reject positions that are not integers between `0` and `8`.
3. Reject moves targeting occupied cells.
4. Place the current player's symbol in the selected cell.
5. Check whether that move produces a winner.
6. If there is a winner, update the status to `"won"` and set the winner.
7. Otherwise, check whether the board is full. If it is, update the status to `"draw"`.
8. If the game continues, switch the current player.
9. Return the updated state.

**Error handling:** Invalid moves must throw a descriptive `Error`. They must not partially modify the original state.

**State management:** Treat the supplied state as immutable. Create a new board and state instead of mutating the input object. For invalid moves, leave the original state unchanged.

When the game ends, retain the player who made the final move as `currentPlayer`. Do not switch turns after a win or draw.

### 6.3 `checkWinner()`

Signature:

```typescript
export function checkWinner(
  board: Board
): Player | null;
```

Check all eight winning combinations:

```typescript
const winningCombinations: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];
```

Requirements:

- Return `"X"` or `"O"` if that player has three matching symbols in a winning combination.
- Return `null` if no winning combination exists.
- Empty cells must never count as a winning combination.
- Do not duplicate winner-detection logic elsewhere.

### 6.4 `isBoardFull()`

Signature:

```typescript
export function isBoardFull(board: Board): boolean;
```

Return `true` only when all nine cells are occupied.

### 6.5 `getGameResult()`

Signature:

```typescript
export function getGameResult(
  state: GameState
): string;
```

Return a human-readable result:

- If X wins: `"Player X wins!"`
- If O wins: `"Player O wins!"`
- If the game is a draw: `"It's a draw!"`
- If the game is ongoing: indicate which player is next.

This function must not change the game state.

## 7. Command-line interface

Implement `src/cli.ts` to let two human players play the game in a terminal.

### Board display

Render the board using a readable layout:

```text
 X | O | 3
---+---+---
 4 | X | 6
---+---+---
 O | 8 | X
```

Display the position number in each empty cell so the user knows which position to enter.

### Interaction flow

1. Create a new game.
2. Display the board and current player.
3. Prompt the current player to select a position from `0` to `8`.
4. Parse the input as an integer.
5. Submit the move to `makeMove()`.
6. If the move is invalid, display the error and ask the same player to try again.
7. Display the updated board after every successful move.
8. If the game has ended, display the final result.
9. Close the input interface and exit cleanly.

Use Node.js's built-in `readline/promises` API or an equally simple built-in approach for terminal input.

The CLI should handle non-numeric input, out-of-range positions, occupied cells, and end-of-input without crashing unexpectedly.

Do not duplicate game rules inside the CLI.

## 8. Application entry point

Implement `src/index.ts` as the application entry point.

Responsibilities:

- Start the CLI.
- Handle unexpected errors at the application boundary.
- Ensure input resources are closed.
- Avoid executing the game automatically when importing the core game module.

The application should be runnable using an npm script.

## 9. Testing requirements

Write unit tests in `tests/game.test.ts` using Vitest.

Test the core logic independently of the CLI.

### Initial state

- The board contains nine empty cells.
- Player X starts.
- Status is `"in-progress"`.
- Winner is `null`.
- Two calls to `createGame()` return independent states.

### Valid moves

- X can occupy an empty cell.
- O plays after X.
- Turns alternate after successful non-final moves.
- The board contains the expected symbols after each move.

### Invalid moves

- Negative positions are rejected.
- Positions greater than `8` are rejected.
- Non-integer positions are rejected.
- Occupied cells are rejected.
- Moves after a win are rejected.
- Moves after a draw are rejected.
- Invalid moves do not change the original state.

### Winning conditions

Test all eight winning combinations:

- Three horizontal rows.
- Three vertical columns.
- Two diagonals.

Verify that both X and O can win.

### Draw conditions

- A full board without a winner produces a draw.
- A full board with a winning combination produces a win, not a draw.
- The game does not end prematurely when the board is not full and there is no winner.

### Immutability

- A valid move returns a new state object.
- The original state and its board remain unchanged.
- Read-only operations such as `checkWinner()` and `getGameResult()` do not mutate their inputs.

### Test quality

- Use descriptive test names.
- Group related tests with `describe()` blocks.
- Avoid tests that depend on execution order.
- Do not test private implementation details when public behavior is sufficient.

## 10. TypeScript configuration and scripts

Configure TypeScript with strict type checking enabled.

Recommended compiler options include:

- `"strict": true`
- `"noUncheckedIndexedAccess": true`
- `"noEmit": true` for type checking, if using a TypeScript runtime such as `tsx`.

Configure npm scripts for:

```json
{
  "scripts": {
    "dev": "tsx src/index.ts",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

Install only the dependencies required by this setup:

- `typescript`
- `tsx`
- `vitest`
- `@types/node`

Use compatible package versions and configure `tsconfig.json` and `package.json` consistently for ES modules.

## 11. Implementation sequence

Implement the application in this order:

1. Initialize the npm project and configure TypeScript.
2. Define the types and implement `createGame()`.
3. Implement `checkWinner()` and `isBoardFull()`.
4. Implement `makeMove()` with validation, immutable updates, and terminal-state handling.
5. Implement `getGameResult()`.
6. Write unit tests for the core game logic.
7. Implement the CLI and board rendering.
8. Add the application entry point and npm scripts.
9. Run the full test suite.
10. Run TypeScript type checking.
11. Manually verify that the CLI supports a complete game, including invalid moves, a win, and a draw.

Do not proceed by building the CLI first and placing game rules inside it.

## 12. Definition of done

The implementation is complete only when all of the following are true:

- [ ] The game can be started using the documented npm command.
- [ ] Two players can play a complete game in the terminal.
- [ ] All eight winning combinations are detected correctly.
- [ ] Draws are detected correctly.
- [ ] Invalid moves produce understandable errors.
- [ ] A finished game cannot accept further moves.
- [ ] The core game logic is independent of the CLI.
- [ ] Game state updates are immutable.
- [ ] Unit tests pass.
- [ ] TypeScript strict type checking passes.
- [ ] No unnecessary dependencies or `any` types have been introduced.
- [ ] The final response explains the implemented files, commands to run, and test results.

## 13. Agent execution instructions

Work directly in the current project workspace.

Before making changes, inspect the existing project structure and configuration. Reuse compatible existing files and dependencies instead of overwriting them unnecessarily.

If no project exists, create the project structure described above.

Implement the actual source files and tests; do not merely provide code snippets or a proposed solution.

After implementation:

1. Run `npm test`.
2. Run `npm run typecheck`.
3. Fix any failures and rerun the relevant commands.
4. Report which files were created or changed.
5. Provide the exact command to launch the game.
6. Report the actual test and type-check results. Never claim a command succeeded unless it was executed successfully.

If a requirement cannot be satisfied, explain the blocker and provide the most complete working implementation possible.

**Priority:** Correct game behavior, type safety, testability, and simplicity take precedence over unnecessary features or architectural complexity.
