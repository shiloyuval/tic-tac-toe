import { resolve } from "node:path";
import { createGameStore, defaultDataFile } from "../storage/gameStore.js";
import { createServer } from "./server.js";

const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error(`Invalid PORT "${process.env.PORT}".`);
  process.exit(1);
}

const server = createServer(createGameStore(), { staticDir: resolve("dist") });

server.on("error", (error) => {
  console.error("Server error:", error.message);
  process.exitCode = 1;
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Tic-Tac-Toe server: http://127.0.0.1:${port}`);
  console.log(`Game data file: ${defaultDataFile()}`);
});
