import { unstable_useRoute } from "react-router";
import { FeatureFlagg } from "./featureflagg";

/**
 * Henter alle påskrudde feature-flagg
 */
function useAlleFeatureFlagg(): Record<FeatureFlagg, boolean> {
  const { loaderData } = unstable_useRoute("root");
  if (!loaderData?.featureFlagg) {
    throw new Error("Feature flagg ikke funnet i root-loader dataen.");
  }
  return loaderData.featureFlagg;
}

/** Returnerer om ett gitt feature flagg er påskrudd */
export function useEnkeltFeatureFlagg(feature: FeatureFlagg): boolean {
  const featureFlagg = useAlleFeatureFlagg();
  return featureFlagg[feature] ?? false;
}
