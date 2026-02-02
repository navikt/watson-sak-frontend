import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { reactRouterDevTools } from "react-router-devtools";
import { defineConfig } from "vite";
import devtoolsJson from "vite-plugin-devtools-json";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  base: "/",
  plugins: [
    tailwindcss(),
    reactRouterDevTools(),
    reactRouter(),
    ...(process.env.NODE_ENV === "development" ? [devtoolsJson()] : []),
    tsconfigPaths(),
  ],
  server: {
    port: 5174,
    hmr: {
      path: "/",
      clientPort: 5174,
      host: "localhost",
    },
  },
});
