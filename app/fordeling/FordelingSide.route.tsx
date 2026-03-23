import { Page } from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { useLoaderData } from "react-router";
import { mockSaksbehandlere } from "~/saker/mock-saksbehandlere.server";
import { mockSaker } from "./mock-data.server";
import { UfordelteSakerInnhold } from "./UfordelteSakerInnhold";

export function loader() {
  return {
    saker: mockSaker,
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
