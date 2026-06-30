import { unstable_useRoute } from "react-router";
import type { Kodeverk } from "~/saker/api.server";

/**
 * Returnerer kodeverk-data (merker, kategorier, misbrukstyper, ytelseTyper, kilder)
 * som er lastet inn ved oppstart av applikasjonen.
 */
export function useKodeverk(): Kodeverk {
  const { loaderData } = unstable_useRoute("root");
  const kodeverk = loaderData?.kodeverk as Kodeverk | undefined;
  if (!kodeverk) {
    throw new Error("Kodeverk er ikke tilgjengelig — er useKodeverk() brukt utenfor root-ruten?");
  }
  return kodeverk;
}
