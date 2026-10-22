---
name: verify-changes
description: "Run the project's typecheck, tests and web build to verify code changes. Use before committing, before declaring a task done, or when the user asks to verify, validate, check or test the changes."
---

# Verify Changes

Confirm that a change is correct before claiming it is done or committing it.

## When to Use

- After editing any file under `src/`, `tests/`, `index.html`, `package.json` or `tsconfig.json`.
- Before a commit, or when the user asks to verify/validate/test.

## Procedure

1. Run `npm run typecheck`.
2. Run `npm test`.
3. If anything under `src/web/`, `index.html`, `package.json` or `tsconfig.json` changed, also run `npm run build:web`. Delete the generated `dist/` folder afterwards (it is gitignored, but keep the tree clean).
4. If the console game or `src/cli.ts`, `src/mode.ts`, `src/game.ts` changed, smoke-test it with piped input (PowerShell): `@("1","0","3","1","4","2") | npm run play` should finish with an X win.
5. On a failure: read the error, fix the cause, and re-run only the failed command, then re-run the full set once at the end. Do not skip, weaken or delete tests to get a pass.
6. Install dependencies only if a command fails because packages are missing.

## Report

State which commands were run and their results (for example "54 tests passed"). Never claim a check passed unless it was actually run in this session. If a check could not be run, say so.
