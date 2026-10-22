import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createGame, makeMove } from "../../src/game.js";
import { createServer } from "../../src/server/server.js";
import { createGameStore } from "../../src/storage/gameStore.js";

let dir: string;
let server: Server;
let baseUrl: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "ttt-server-"));
  await mkdir(join(dir, "dist"));
  await writeFile(join(dir, "dist", "index.html"), "<h1>game</h1>");
  await writeFile(join(dir, "secret.txt"), "secret");

  server = createServer(createGameStore(join(dir, "data", "game-data.json")), {
    staticDir: join(dir, "dist"),
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
  await rm(dir, { recursive: true, force: true });
});

function send(method: string, path: string, body?: unknown): Promise<Response> {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

const midGame = makeMove(makeMove(createGame(), 0), 4);

describe("game API", () => {
  it("returns empty data initially", async () => {
    const response = await send("GET", "/api/state");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      version: 1,
      scores: { player1Wins: 0, player2Wins: 0, draws: 0 },
      pausedGame: null,
    });
  });

  it("pauses, loads and discards a game", async () => {
    const paused = await send("PUT", "/api/paused-game", {
      state: midGame,
      mode: "computer",
      difficulty: "hard",
    });
    expect(paused.status).toBe(200);

    const loaded = (await (await send("GET", "/api/state")).json()) as {
      pausedGame: { state: unknown; difficulty: string };
    };
    expect(loaded.pausedGame.state).toEqual(midGame);
    expect(loaded.pausedGame.difficulty).toBe("hard");

    const discarded = (await (await send("DELETE", "/api/paused-game")).json()) as { pausedGame: unknown };
    expect(discarded.pausedGame).toBeNull();
  });

  it("records a finished game, clears the paused game and resets scores", async () => {
    await send("PUT", "/api/paused-game", { state: midGame, mode: "two-players" });
    const finished = (await (await send("POST", "/api/finish", { outcome: "player1-win" })).json()) as {
      scores: { player1Wins: number };
      pausedGame: unknown;
    };
    expect(finished.scores.player1Wins).toBe(1);
    expect(finished.pausedGame).toBeNull();

    const reset = (await (await send("DELETE", "/api/scores")).json()) as { scores: { player1Wins: number } };
    expect(reset.scores.player1Wins).toBe(0);
  });

  it("rejects invalid input with 400", async () => {
    expect((await send("POST", "/api/finish", { outcome: "x-win" })).status).toBe(400);
    expect((await send("POST", "/api/finish", "not json")).status).toBe(400);
    expect((await send("PUT", "/api/paused-game", { state: midGame, mode: "teams" })).status).toBe(400);
    const won = [0, 3, 1, 4, 2].reduce(makeMove, createGame());
    expect((await send("PUT", "/api/paused-game", { state: won, mode: "two-players" })).status).toBe(400);
  });

  it("rejects an oversized body with 413", async () => {
    const response = await send("POST", "/api/finish", { outcome: "draw", padding: "x".repeat(10_000) });
    expect(response.status).toBe(413);
  });

  it("returns 405 for a wrong method and 404 for an unknown path", async () => {
    expect((await send("POST", "/api/state")).status).toBe(405);
    expect((await send("GET", "/api/scores")).status).toBe(405);
    expect((await send("GET", "/api/unknown")).status).toBe(404);
  });
});

describe("static files", () => {
  it("serves index.html and blocks path traversal", async () => {
    const page = await send("GET", "/");
    expect(page.status).toBe(200);
    expect(await page.text()).toContain("game");
    expect((await send("GET", "/missing.js")).status).toBe(404);
    expect((await send("GET", "/..%2Fsecret.txt")).status).toBe(404);
  });
});
