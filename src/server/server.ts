import { readFile } from "node:fs/promises";
import { createServer as createHttpServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { extname, resolve, sep } from "node:path";
import { parseOutcome, parsePauseRequest } from "../storage/model.js";
import type { GameStore } from "../storage/gameStore.js";

const MAX_BODY_BYTES = 4096;

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".map": "application/json; charset=utf-8",
};

export interface ServerOptions {
  staticDir?: string;
}

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function requireMethod(method: string, allowed: string): void {
  if (method !== allowed) {
    throw new HttpError(405, `Method ${method} is not allowed here.`);
  }
}

// The whole body is always consumed so an oversized request still receives a response.
async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = chunk as Buffer;
    size += buffer.length;
    if (size <= MAX_BODY_BYTES) chunks.push(buffer);
  }
  if (size > MAX_BODY_BYTES) throw new HttpError(413, "Request body is too large.");

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

async function handleApi(
  store: GameStore,
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string
): Promise<void> {
  const method = req.method ?? "GET";

  switch (pathname) {
    case "/api/state":
      requireMethod(method, "GET");
      return sendJson(res, 200, await store.load());

    case "/api/finish": {
      requireMethod(method, "POST");
      const body = await readJsonBody(req);
      const outcome = parseOutcome(
        typeof body === "object" && body !== null && "outcome" in body ? body.outcome : undefined
      );
      if (outcome === null) throw new HttpError(400, "Invalid outcome.");
      return sendJson(res, 200, await store.finishGame(outcome));
    }

    case "/api/paused-game":
      if (method === "PUT") {
        const request = parsePauseRequest(await readJsonBody(req));
        if (request === null) throw new HttpError(400, "Invalid game to pause.");
        return sendJson(res, 200, await store.pauseGame(request.state, request.mode));
      }
      requireMethod(method, "DELETE");
      return sendJson(res, 200, await store.discardPausedGame());

    case "/api/scores":
      requireMethod(method, "DELETE");
      return sendJson(res, 200, await store.resetScores());

    default:
      throw new HttpError(404, "Not found.");
  }
}

async function serveStatic(root: string, pathname: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== "GET" && req.method !== "HEAD") throw new HttpError(405, "Method not allowed.");

  let relative: string;
  try {
    relative = decodeURIComponent(pathname === "/" ? "/index.html" : pathname);
  } catch {
    throw new HttpError(404, "Not found.");
  }

  const base = resolve(root);
  const filePath = resolve(base, `.${relative}`);
  if (!filePath.startsWith(base + sep)) throw new HttpError(404, "Not found.");

  let content: Buffer;
  try {
    content = await readFile(filePath);
  } catch {
    throw new HttpError(404, "Not found.");
  }
  res.writeHead(200, { "Content-Type": CONTENT_TYPES[extname(filePath)] ?? "application/octet-stream" });
  res.end(req.method === "HEAD" ? undefined : content);
}

export function createServer(store: GameStore, options: ServerOptions = {}): Server {
  return createHttpServer((req, res) => {
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;

    const handle = pathname.startsWith("/api/")
      ? handleApi(store, req, res, pathname)
      : options.staticDir !== undefined
        ? serveStatic(options.staticDir, pathname, req, res)
        : Promise.reject(new HttpError(404, "Not found."));

    handle.catch((error: unknown) => {
      if (error instanceof HttpError) {
        sendJson(res, error.status, { error: error.message });
        return;
      }
      console.error("Unexpected server error:", error);
      sendJson(res, 500, { error: "Internal server error." });
    });
  });
}
