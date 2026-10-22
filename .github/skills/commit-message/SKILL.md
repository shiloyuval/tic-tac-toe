---
name: commit-message
description: "Write a well-explained git commit message and create the commit. Use whenever the user asks to commit, make a commit, commit the changes, save changes to git, or write a commit message."
---

# Commit Message

Create a clear, well-explained commit message every time the user asks to commit.

## When to Use

- The user asks to "commit", "commit the changes", "make a commit" or similar.
- The user asks for a commit message.

## Procedure

1. Inspect what will be committed:
   - `git status --short`
   - `git --no-pager diff` and `git --no-pager diff --staged`
   - For new, untracked files, read them to understand their purpose.
2. Stage the intended changes with `git add`. Do not stage secrets, `node_modules/`, or build output. If it is unclear which changes belong together, ask the user.
3. Write the message using the format below, based on the actual diff, not on assumptions.
4. Commit with `git commit`, passing the message via a PowerShell here-string, for example `$msg = @'...'@; git commit -m $msg`.
5. Verify with `git --no-pager log --oneline -3` and report the commit hash and the files included.

## Message Format

```text
<Subject line>

<Body paragraph: what changed and why>

<Optional grouped bullet lists by area>

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

### Subject line

- Imperative mood ("Add computer opponent", not "Added" or "Adds").
- 50 characters or fewer when possible, never more than 72.
- Capitalized, with no trailing period.
- Describes the overall change, not the individual files.

### Body

- Separate it from the subject with a blank line and wrap lines at about 72 characters.
- Explain what changed and why, not a line-by-line recap of the diff.
- Group related points under short headings such as `Core logic (src/game.ts):`, with one `-` bullet per point.
- Mention behavior that matters to reviewers: new commands, changed behavior, error handling, new dependencies, test coverage.
- Only state facts that are true of this commit. Do not claim tests pass unless they were run.

### Trailer

Always end with a blank line followed by the trailer below, unless the user explicitly asks not to include it:

```text
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

## Rules

- One logical change per commit. If the working tree holds unrelated changes, suggest separate commits.
- Never commit secrets, credentials, or `.env` files.
- Do not amend, rebase, force-push, or push unless the user asks.
- If there is nothing to commit, say so instead of creating an empty commit.
