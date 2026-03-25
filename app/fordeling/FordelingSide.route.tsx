import { Page } from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { data, useLoaderData } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { skalBrukeMockdata } from "~/config/env.server";
import { RouteConfig } from "~/routeConfig";
import type { Route } from "./+types/FordelingSide.route";
import { mapKontrollsakTilFordelingSak, erUfordeltKontrollsak } from "./mapper";
import { mockSaksbehandlere } from "~/saker/mock-saksbehandlere.server";
import { mockSaker } from "./mock-data.server";
import { hentKontrollsakerForFordeling, tildelKontrollsak } from "./api.server";
import { UfordelteSakerInnhold } from "./UfordelteSakerInnhold";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const handling = formData.get("handling");

  if (handling !== "tildel") {
    throw data("Ukjent handling", { status: 400 });
  }

  const sakId = formData.get("sakId");
  const saksbehandler = formData.get("saksbehandler");

  if (typeof sakId !== "string" || typeof saksbehandler !== "string") {
    throw data("Mangler sak eller saksbehandler for tildeling.", { status: 400 });
  }

  if (skalBrukeMockdata) {
    const sak = mockSaker.find((eksisterendeSak) => eksisterendeSak.id === sakId);

    if (!sak) {
      throw data("Sak ikke funnet", { status: 404 });
    }

    sak.status = "under utredning";
    return { ok: true };
  }

  const token = await getBackendOboToken(request);
  await tildelKontrollsak({ token, sakId, saksbehandler });

  return { ok: true };
}

export async function loader({ request }: Route.LoaderArgs) {
  const kontrollsaker = await hentKontrollsakerForFordeling(request);
  const saker = kontrollsaker
    ? kontrollsaker.items.filter(erUfordeltKontrollsak).map(mapKontrollsakTilFordelingSak)
    : mockSaker
        .filter((sak) => sak.status === "tips mottatt" || sak.status === "tips avklart")
        .map((sak) => ({
          id: sak.id,
          opprettetDato: sak.datoInnmeldt,
          kategori: sak.kategori ?? null,
          ytelser: sak.ytelser,
        }));

  return {
    saker,
    saksbehandlere: mockSaksbehandlere,
  };
}

export default function FordelingSide() {
  const { saker, saksbehandlere } = useLoaderData<typeof loader>();

  return (
    <Page>
      <title>Ufordelte saker – Watson Sak</title>
      <PageBlock width="xl" gutters className="!mx-0">
        <UfordelteSakerInnhold
          saker={saker}
          saksbehandlere={saksbehandlere}
          submitPath={RouteConfig.FORDELING}
        />
      </PageBlock>
    </Page>
  );
}
