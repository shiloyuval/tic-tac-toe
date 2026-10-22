---
name: update-docs
description: "Keep project documentation in sync with the code. Use after changing behavior, scripts, file structure or rules, or when the user asks to update, write or check the README or the project md files."
---

# Update Docs

Keep documentation accurate whenever code behavior, commands or structure change.

## Documents

| File | Content |
|---|---|
| `README.md` | How to install, run (console and web), test and build; short feature overview |
| `tic-tac-toe.md` | Spec for the core game and the CLI |
| `tic-tac-toe-web.md` | Plan/spec for the web version |
| `.github/copilot-instructions.md` | Project rules, architecture and commands |
| `package.json` `description` | One-line summary of the project |

## Procedure

1. Identify what changed: `git --no-pager diff` or the commits in question.
2. Find affected docs: new/renamed npm scripts, changed file structure, new modes or features, changed rules.
3. Update only what is directly affected, using the document's existing style. Make sure the commands in docs match the scripts in `package.json`.
4. If `README.md` does not exist and the project is runnable, create it with: description, requirements (Node.js), install (`npm install`), run commands (`npm run play`, `npm run dev:web`, `npm run build:web`), test commands (`npm test`, `npm run typecheck`) and project structure.
5. Keep the architecture table and commands table in `.github/copilot-instructions.md` consistent with the code.
6. Do not document features that do not exist, and do not rewrite unrelated sections.

## Report

List the files updated and what changed in each.
