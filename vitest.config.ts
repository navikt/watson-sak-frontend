import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    include: ["app/**/*.test.{ts,tsx}"],
    exclude: ["app/**/*.spec.ts", "**/node_modules/**", "**/dist/**"],
    globals: true,
  },
});
