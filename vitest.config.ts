import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    logHeapUsage: false,
    globals: true,
    environment: "node", // or "jsdom" if you test React components
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
