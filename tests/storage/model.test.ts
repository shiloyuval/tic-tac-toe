import { describe, expect, it } from "vitest";
import { createGame, makeMove } from "../../src/game.js";
import type { GameState } from "../../src/game.js";
import {
  clearPausedGame,
  createEmptyGameData,
  outcomeOf,
  parseGameData,
  parseInProgressState,
  parsePauseRequest,
  pauseGame,
  recordOutcome,
  resetScores,
  shouldRecord,
} from "../../src/storage/model.js";

function play(...positions: number[]): GameState {
  return positions.reduce(makeMove, createGame());
}

const xWin = play(0, 3, 1, 4, 2);
const oWin = play(0, 3, 1, 4, 8, 5);
const draw = play(0, 1, 2, 4, 3, 5, 7, 6, 8);

describe("outcomeOf", () => {
  it("maps X to Player 1 and O to Player 2", () => {
    expect(outcomeOf(xWin)).toBe("player1-win");
    expect(outcomeOf(oWin)).toBe("player2-win");
  });

  it("maps a draw and returns null while in progress", () => {
    expect(draw.status).toBe("draw");
    expect(outcomeOf(draw)).toBe("draw");
    expect(outcomeOf(createGame())).toBeNull();
  });
});

describe("shouldRecord", () => {
  it("records only two-player games", () => {
    expect(shouldRecord("two-players")).toBe(true);
    expect(shouldRecord("computer")).toBe(false);
  });
});

describe("recordOutcome", () => {
  it("increments the matching counter without mutating the input", () => {
    const data = createEmptyGameData();
    const next = recordOutcome(recordOutcome(recordOutcome(data, "player1-win"), "player2-win"), "draw");
    expect(next.scores).toEqual({ player1Wins: 1, player2Wins: 1, draws: 1 });
    expect(data.scores).toEqual({ player1Wins: 0, player2Wins: 0, draws: 0 });
  });

  it("clears the paused game", () => {
    const paused = pauseGame(createEmptyGameData(), play(0), "two-players");
    expect(recordOutcome(paused, "draw").pausedGame).toBeNull();
  });
});

describe("pauseGame", () => {
  const now = new Date("2026-01-01T10:00:00.000Z");

  it("stores the state, mode, difficulty and time", () => {
    const state = play(0, 4);
    const data = pauseGame(createEmptyGameData(), state, "computer", "hard", now);
    expect(data.pausedGame).toEqual({
      state,
      mode: "computer",
      difficulty: "hard",
      pausedAt: now.toISOString(),
    });
  });

  it("uses the default difficulty when none is given", () => {
    const data = pauseGame(createEmptyGameData(), play(0), "computer");
    expect(data.pausedGame?.difficulty).toBe("medium");
  });

  it("rejects finished games", () => {
    expect(() => pauseGame(createEmptyGameData(), xWin, "two-players")).toThrow();
    expect(() => pauseGame(createEmptyGameData(), draw, "two-players")).toThrow();
  });
});

describe("clearPausedGame and resetScores", () => {
  it("resetScores keeps the paused game and clearPausedGame keeps the scores", () => {
    const data = pauseGame(recordOutcome(createEmptyGameData(), "draw"), play(0), "two-players");
    expect(resetScores(data).pausedGame).not.toBeNull();
    expect(resetScores(data).scores.draws).toBe(0);
    expect(clearPausedGame(data).pausedGame).toBeNull();
    expect(clearPausedGame(data).scores.draws).toBe(1);
  });
});

describe("parseInProgressState", () => {
  it("accepts a valid game in progress", () => {
    expect(parseInProgressState(play(0, 4, 8))).toEqual(play(0, 4, 8));
  });

  it("rejects inconsistent or finished games", () => {
    const valid = play(0, 4);
    const cases: unknown[] = [
      null,
      "game",
      { ...valid, board: valid.board.slice(0, 8) },
      { ...valid, board: valid.board.map((cell, i) => (i === 1 ? "Z" : cell)) },
      { ...valid, board: ["X", "X", "X", null, null, null, null, null, null], currentPlayer: "O" },
      { ...valid, currentPlayer: "O" },
      { ...valid, status: "won" },
      { ...valid, winner: "X" },
      xWin,
      draw,
    ];
    for (const value of cases) {
      expect(parseInProgressState(value)).toBeNull();
    }
  });
});

describe("parseGameData", () => {
  const valid = pauseGame(recordOutcome(createEmptyGameData(), "player1-win"), play(0, 4), "two-players");

  it("round-trips valid data", () => {
    expect(parseGameData(JSON.parse(JSON.stringify(valid)))).toEqual(valid);
  });

  it("rejects an unknown version or invalid counters", () => {
    expect(() => parseGameData({ ...valid, version: 2 })).toThrow();
    expect(() => parseGameData({ ...valid, scores: { ...valid.scores, draws: -1 } })).toThrow();
    expect(() => parseGameData({ ...valid, scores: { ...valid.scores, draws: 1.5 } })).toThrow();
    expect(() => parseGameData({ ...valid, scores: null })).toThrow();
    expect(() => parseGameData("nope")).toThrow();
  });

  it("drops an invalid paused game but keeps the scores", () => {
    const broken = { ...valid, pausedGame: { ...valid.pausedGame, mode: "teams" } };
    const data = parseGameData(broken);
    expect(data.pausedGame).toBeNull();
    expect(data.scores.player1Wins).toBe(1);
  });

  it("keeps the saved difficulty", () => {
    const hard = pauseGame(createEmptyGameData(), play(0, 4), "computer", "hard");
    expect(parseGameData(JSON.parse(JSON.stringify(hard))).pausedGame?.difficulty).toBe("hard");
  });

  it("falls back to the default difficulty for old or invalid saves", () => {
    const withoutLevel = JSON.parse(JSON.stringify(valid));
    delete withoutLevel.pausedGame.difficulty;
    expect(parseGameData(withoutLevel).pausedGame?.difficulty).toBe("medium");

    const invalidLevel = { ...valid, pausedGame: { ...valid.pausedGame, difficulty: "insane" } };
    expect(parseGameData(invalidLevel).pausedGame?.difficulty).toBe("medium");
  });
});

describe("parsePauseRequest", () => {
  const state = play(0, 4);

  it("accepts a valid request with a difficulty", () => {
    expect(parsePauseRequest({ state, mode: "computer", difficulty: "easy" })).toEqual({
      state,
      mode: "computer",
      difficulty: "easy",
    });
  });

  it("uses the default difficulty when it is missing or unknown", () => {
    expect(parsePauseRequest({ state, mode: "computer" })?.difficulty).toBe("medium");
    expect(parsePauseRequest({ state, mode: "computer", difficulty: 3 })?.difficulty).toBe("medium");
  });

  it("rejects an invalid mode or state", () => {
    expect(parsePauseRequest({ state, mode: "teams" })).toBeNull();
    expect(parsePauseRequest({ state: xWin, mode: "computer" })).toBeNull();
    expect(parsePauseRequest(null)).toBeNull();
  });
});
