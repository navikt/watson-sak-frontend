import { Page } from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { useLoaderData } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { mockSaksbehandlere } from "~/saker/mock-saksbehandlere.server";
import { action, loader as lastSakerForFordeling } from "./FordelingSide.server";
import { UfordelteSakerInnhold } from "./UfordelteSakerInnhold";

export { action };

export async function loader(args: Parameters<typeof lastSakerForFordeling>[0]) {
  const saker = await lastSakerForFordeling(args);

  return {
    saker,
    saksbehandlere: mockSaksbehandlere,
  };
}

export default function FordelingSide() {
  const { saker, saksbehandlere } = useLoaderData<typeof loader>();

  return (
    <Page>
      <title>Fordeling – Watson Sak</title>
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
