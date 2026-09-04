import type { KnipConfig } from "knip";

const config: KnipConfig = {
  ignore: ["app/feature-toggling/useFeatureFlagg.tsx"],
  ignoreDependencies: [
    "react-error-boundary",
    // Brukes via CSS @import i globals.css — ikke TypeScript-importer:
    "@navikt/ds-css",
    "tailwindcss",
  ],
  project: ["**/*.{ts,tsx}"],
};

export default config;
