import { unstable_useRoute } from "react-router";

/**
 * Henter innlogget bruker fra root-loaderen, uten å kaste hvis dataen mangler.
 *
 * Brukes typisk i komponenter som også kan rendres i en feilside (f.eks.
 * AppHeader inni InternalServerError), der root-loaderen kan ha feilet.
 */
export function useInnloggetBrukerValgfri() {
  const rootLoaderData = unstable_useRoute("root");
  return rootLoaderData?.loaderData?.user;
}

/**
 * Henter innlogget bruker fra root-loaderen. Kaster hvis brukeren mangler –
 * kun trygt å bruke i komponenter som alltid rendres etter en vellykket
 * root-loader (dvs. ikke i feilsider).
 */
export function useInnloggetBruker() {
  const user = useInnloggetBrukerValgfri();
  if (!user) {
    throw new Error("Bruker ikke funnet i root-loader dataen");
  }
  return user;
}
