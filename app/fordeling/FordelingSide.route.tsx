import { Page } from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { useLoaderData } from "react-router";
import { mapKontrollsakTilFordelingSak, erUfordeltKontrollsak } from "./mapper";
import { mockSaksbehandlere } from "~/saker/mock-saksbehandlere.server";
import { mockSaker } from "./mock-data.server";
import { hentKontrollsakerForFordeling } from "./api.server";
import { UfordelteSakerInnhold } from "./UfordelteSakerInnhold";

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
        <UfordelteSakerInnhold saker={saker} saksbehandlere={saksbehandlere} />
      </PageBlock>
    </Page>
  );
}
