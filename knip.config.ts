import type { KnipConfig } from "knip";

const config: KnipConfig = {
  ignore: ["app/feature-toggling/useFeatureFlagg.tsx", "app/test/uu-util.ts"],
  ignoreDependencies: ["react-error-boundary", "@axe-core/playwright"],
};

export default config;
