import type { KnipConfig } from "knip";

const config: KnipConfig = {
  ignore: ["app/feature-toggling/useFeatureFlagg.tsx"],
  ignoreDependencies: ["react-error-boundary"],
};

export default config;
