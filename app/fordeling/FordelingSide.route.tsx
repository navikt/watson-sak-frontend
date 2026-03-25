import { Page } from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { useLoaderData } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { skalBrukeMockdata } from "~/config/env.server";
import { mapKontrollsakTilFordelingSak, erUfordeltKontrollsak } from "./mapper";
import { mockSaksbehandlere } from "~/saker/mock-saksbehandlere.server";
import { mockSaker } from "./mock-data.server";
import { hentKontrollsakerForFordeling, tildelKontrollsak } from "./api.server";
import { UfordelteSakerInnhold } from "./UfordelteSakerInnhold";

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const handling = formData.get("handling");

  if (handling !== "tildel") {
    return { ok: false };
  }

  const sakId = formData.get("sakId");
  const saksbehandler = formData.get("saksbehandler");

  if (typeof sakId !== "string" || typeof saksbehandler !== "string") {
    throw new Error("Mangler sak eller saksbehandler for tildeling.");
  }

  if (skalBrukeMockdata) {
    const sak = mockSaker.find((eksisterendeSak) => eksisterendeSak.id === sakId);

    if (!sak) {
      throw new Error(`Fant ikke sak ${sakId}.`);
    }

    sak.status = "under utredning";
    return { ok: true };
  }

  const token = await getBackendOboToken(request);
  await tildelKontrollsak({ token, sakId, saksbehandler });

  return { ok: true };
}

export async function loader({ request }: { request: Request }) {
  const kontrollsaker = await hentKontrollsakerForFordeling(request);
  const saker = kontrollsaker
    ? kontrollsaker.items.filter(erUfordeltKontrollsak).map(mapKontrollsakTilFordelingSak)
    : mockSaker
        .filter((sak) => sak.status === "tips mottatt" || sak.status === "tips avklart")
        .map((sak) => ({
          id: sak.id,
          opprettetDato: sak.datoInnmeldt,
          kategori: sak.kategori ?? null,
          kategoriVariant: "neutral" as const,
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
          submitPath="/fordeling"
        />
      </PageBlock>
    </Page>
  );
}
