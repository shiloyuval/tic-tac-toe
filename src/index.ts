import { runCli } from "./cli.js";

try {
  await runCli();
} catch (error) {
  console.error("Unexpected error:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
