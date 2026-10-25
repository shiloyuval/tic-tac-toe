---
name: code-review
description: "Review code changes in this project against its rules and look for real bugs. Use when the user asks to review, audit or critique code, a diff, a branch or a commit, or asks whether changes follow the project rules."
---

# Code Review

Review changes for correctness first, then for compliance with the project rules in `.github/copilot-instructions.md` and `design/tic-tac-toe.md`.

## Procedure

1. Get the changes: `git --no-pager diff`, `git --no-pager diff --staged`, or `git --no-pager show <commit>`. Read the full surrounding files, not only the diff.
2. Check correctness: logic errors, off-by-one positions, stale state, timer or async races (e.g. a pending computer move after reset or mode change), unhandled errors, missing edge cases.
3. Check the project rules:
   - Game rules live only in `game.ts`; no duplicated winner detection or move validation in UIs.
   - `game.ts`, `computer.ts`, `mode.ts` have no Node or browser APIs.
   - `src/web/*` does not import `cli.ts` or `node:*`; the controller does not touch the DOM; the view contains no rules.
   - State is immutable; invalid moves throw and leave the input state unchanged.
   - No `any`, no unnecessary dependencies, strict TypeScript options intact.
   - Small, focused functions; comments only where needed.
4. Check tests: changed behavior is covered, tests have descriptive names, are independent of order, and test public behavior.
5. Check the web UI: keyboard accessibility, `aria-live` status, input blocked while the computer is thinking, responsive layout.
6. Optionally run the `verify-changes` skill to back findings with evidence.

## Report

- Only report issues that matter: bugs, rule violations, missing tests, accessibility problems. Skip style nitpicks and formatting.
- For each finding give the file, the problem, why it matters and a suggested fix.
- Order findings by severity. If there are no significant problems, say so briefly.
- Do not modify code unless the user asks for fixes.
