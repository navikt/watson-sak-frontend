import { useLoaderData } from "react-router";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { MiljøtilpassetTittel } from "~/layout/MiljøtilpassetTittel";
import { MigreringInnhold } from "./MigreringInnhold";
import { MOCK_MIGRERING_KANDIDATER } from "./mock-data";
import type { Route } from "./+types/MigreringSide.route";

export const handle = { bredPageBlock: true };

export async function loader({ request }: Route.LoaderArgs) {
  const innloggetBruker = await hentInnloggetBruker({ request });

  // Foreløpig brukes mock-data til backend-endepunktet er på plass
  const kandidater = MOCK_MIGRERING_KANDIDATER;

  return {
    kandidater,
    innloggetNavIdent: innloggetBruker.navIdent,
  };
}

export default function MigreringSide() {
  const { kandidater, innloggetNavIdent } = useLoaderData<typeof loader>();

  return (
    <>
      <MiljøtilpassetTittel>Migrering – Watson Sak</MiljøtilpassetTittel>
      <MigreringInnhold kandidater={kandidater} innloggetNavIdent={innloggetNavIdent} />
    </>
  );
}
