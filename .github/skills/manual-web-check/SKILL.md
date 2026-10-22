---
name: manual-web-check
description: "Run the web game in a browser and manually verify it end to end. Use after UI changes, when the user asks to try, test, play or visually check the web game, or to validate the web acceptance criteria."
---

# Manual Web Check

Verify the web game works in a real browser, not only in unit tests.

## Procedure

1. Start the dev server in the background: `npm run dev:web` (async, detached only if the user needs it afterwards). Read its output for the local URL (usually `http://localhost:5173`) and confirm it responds.
2. Open the page with the browser tools and take a screenshot.
3. Walk through these scenarios and check the status line and board after each:
   - Two players: play a full game to an X win and confirm the winning line is highlighted and the board is locked.
   - Two players: play a draw and confirm the "draw" message.
   - Two players: click an occupied cell, which must show an error or be disabled, and must not change the turn.
   - Vs computer: pick the mode, play a move, confirm the computer replies as O after a short delay and clicks are ignored meanwhile.
   - "New game" resets the board; switching mode mid-game resets the game and cancels a pending computer move.
   - Keyboard only: Tab to cells, press Enter or Space to play; focus ring is visible.
   - Narrow viewport (about 375 px wide): board fits and nothing overflows.
4. Check the browser console for errors.
5. Stop the dev server process you started (by its PID or shell id) when finished.

## Report

List each scenario with pass/fail and include details for failures. Say clearly which scenarios could not be checked.
