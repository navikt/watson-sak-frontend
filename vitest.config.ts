import { defineConfig } from "vitest/config";

const exclude = ["app/**/*.spec.ts", "**/node_modules/**", "**/dist/**"];

/**
 * Filer som ikke virker i `vmThreads`, fordi hver testfil får egen V8-kontekst der:
 * - signerte cookies feiler (`crypto` og `Uint8Array` fra ulike kontekster)
 * - `ReadableStream` mangler som global (dokumenteditoren)
 * Disse kjører i vanlige `threads`.
 */
const trengerThreads = [
  "app/registrer-sak/forhåndsutfyll.api.test.ts",
  "app/saker/filer/dokument/DokumentEditor.test.tsx",
  "app/saker/filer/dokument/DokumentEditor.kommentarer.test.tsx",
  "app/saker/filer/dokument/DokumentSide.render.test.tsx",
];

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: "vm",
          // Gjenbruker jsdom per worker, men beholder isolasjon per fil. Mye raskere enn threads.
          pool: "vmThreads",
          include: ["app/**/*.test.{ts,tsx}"],
          exclude: [...exclude, ...trengerThreads],
        },
      },
      {
        extends: true,
        test: {
          name: "threads",
          pool: "threads",
          include: trengerThreads,
          exclude,
        },
      },
    ],
  },
});
