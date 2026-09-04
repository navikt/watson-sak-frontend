import type { KnipConfig } from "knip";

const config: KnipConfig = {
  ignore: ["app/feature-toggling/useFeatureFlagg.tsx"],
  ignoreDependencies: [
    "react-error-boundary",
    // Brukes via CSS @import i globals.css — ikke TypeScript-importer:
    "@navikt/ds-css",
    "tailwindcss",
  ],
  // react-router genererer typer via rootDirs i tsconfig, men knip forstår ikke rootDirs.
  // Inkluder de genererte typene eksplisitt slik at knip kan løse +types/-importer.
  project: ["**/*.{ts,tsx}"],
};

export default config;
