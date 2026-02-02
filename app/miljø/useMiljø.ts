import { unstable_useRoute } from "react-router";

/**
 * Henter miljøet appen kjører i
 * @returns Miljøet appen kjører i
 */
export function useMiljø() {
  const { loaderData } = unstable_useRoute("root");
  const miljø = loaderData?.envs.miljø;
  return miljø;
}
