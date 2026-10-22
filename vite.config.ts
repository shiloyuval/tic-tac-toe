import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset paths keep the build working under /tic-tac-toe/ on GitHub Pages and at any other root.
  base: "./",
  server: {
    proxy: {
      "/api": "http://127.0.0.1:3001",
    },
  },
});
