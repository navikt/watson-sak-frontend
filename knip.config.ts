import type { KnipConfig } from "knip";

const config: KnipConfig = {
  ignore: ["app/feature-toggling/useFeatureFlagg.tsx", "playwright.backend.mock.cjs"],
  ignoreDependencies: ["react-error-boundary"],
};

export default config;
