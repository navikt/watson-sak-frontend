import { unstable_useRoute } from "react-router";

export function useInnloggetBruker() {
  const rootLoaderData = unstable_useRoute("root");
  if (!rootLoaderData?.loaderData?.user) {
    throw new Error("Bruker ikke funnet i root-loader dataen");
  }
  return rootLoaderData.loaderData.user;
}
