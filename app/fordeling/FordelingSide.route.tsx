import { useLoaderData } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import { RouteConfig } from "~/routeConfig";
import { erBackendUtilgjengelig } from "~/utils/backend-utilgjengelig.server";
import * as backendApi from "~/saker/api.server";
import { mockSaksbehandlere, mockSaksbehandlerDetaljer } from "~/saker/mock-saksbehandlere.server";
import { action, loader as lastSakerForFordeling } from "./FordelingSide.server";
import { UfordelteSakerInnhold } from "./UfordelteSakerInnhold";
import { useKodeverk } from "~/kodeverk/useKodeverk";

export { action };

/** Tabellen med ufordelte saker er bred, så siden ber layouten om å slippe
 * maks-bredden for å unngå unødvendig horisontal scroll på brede skjermer. */
export const handle = { bredPageBlock: true };

export async function loader(args: Parameters<typeof lastSakerForFordeling>[0]) {
  let fordelingsdata: Awaited<ReturnType<typeof lastSakerForFordeling>>;
  try {
    fordelingsdata = await lastSakerForFordeling(args);
  } catch (feil) {
    if (!erBackendUtilgjengelig(feil)) throw feil;
    return {
      saker: [],
      enhet: null,
      valgtOmfang: "",
      organisasjonsvalg: [],
      oppsummering: { antallSaker: 0, eldsteLiggetidDager: 0 },
      paginering: { side: 1, totalSider: 0, totalAntall: 0 },
      saksbehandlere: [],
      saksbehandlerDetaljer: [],
      saksdataUtilgjengelig: true,
      erLesebruker: true,
    };
  }

  if (!skalBrukeMockdata) {
    const token = await getBackendOboToken(args.request);
    const bruker = await hentInnloggetBruker({ request: args.request, oboToken: token });
    if (bruker.erLesebruker) {
      return {
        ...fordelingsdata,
        saksbehandlere: [],
        saksbehandlerDetaljer: [],
        saksdataUtilgjengelig: false,
        erLesebruker: true,
      };
    }

    const saksbehandlerDetaljer = await backendApi.hentSaksbehandlere(token);
    return {
      ...fordelingsdata,
      saksbehandlere: saksbehandlerDetaljer.map((sb) => sb.navn),
      saksbehandlerDetaljer,
      saksdataUtilgjengelig: false,
      erLesebruker: false,
    };
  }

  return {
    ...fordelingsdata,
    saksbehandlere: mockSaksbehandlere,
    saksbehandlerDetaljer: mockSaksbehandlerDetaljer,
    saksdataUtilgjengelig: false,
    erLesebruker: false,
  };
}

export default function FordelingSide() {
  const fordelingsdata = useLoaderData<typeof loader>();
  const { kategorier, misbrukstyper, merker } = useKodeverk();

  return (
    <UfordelteSakerInnhold
      {...fordelingsdata}
      filtervalg={{
        kategorier: kategorier.map((k) => ({ verdi: k.kode, etikett: k.beskrivelse })),
        misbrukstyper: misbrukstyper.map((m) => ({ verdi: m.kode, etikett: m.beskrivelse })),
        merkinger: merker.map((merke) => ({ verdi: merke, etikett: merke })),
      }}
      submitPath={RouteConfig.FORDELING}
    />
  );
}
