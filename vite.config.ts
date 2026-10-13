import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  plugins: [tailwindcss(), reactRouter()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 5174,
    hmr: {
      path: "/",
      clientPort: 5174,
      host: "localhost",
    },
  },
  // Skann alle klientfiler ved oppstart, så Vite ikke oppdager nye avhengigheter
  // underveis og laster siden på nytt (gir ustabile E2E-tester med kald cache).
  optimizeDeps: {
    entries: ["app/**/*.tsx", "!app/**/*.{test,spec}.tsx"],
  },
});
