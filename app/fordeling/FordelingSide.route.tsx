import { Page } from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { useLoaderData } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { skalBrukeMockdata } from "~/config/env.server";
import { RouteConfig } from "~/routeConfig";
import * as backendApi from "~/saker/api.server";
import { mockSaksbehandlere, mockSaksbehandlerDetaljer } from "~/saker/mock-saksbehandlere.server";
import { action, loader as lastSakerForFordeling } from "./FordelingSide.server";
import { UfordelteSakerInnhold } from "./UfordelteSakerInnhold";

export { action };

export async function loader(args: Parameters<typeof lastSakerForFordeling>[0]) {
  const saker = await lastSakerForFordeling(args);

  if (!skalBrukeMockdata) {
    const token = await getBackendOboToken(args.request);
    const saksbehandlerDetaljer = await backendApi.hentSaksbehandlere(token);
    return {
      saker,
      saksbehandlere: saksbehandlerDetaljer.map((sb) => sb.navn),
      saksbehandlerDetaljer,
    };
  }

  return {
    saker,
    saksbehandlere: mockSaksbehandlere,
    saksbehandlerDetaljer: mockSaksbehandlerDetaljer,
  };
}

export default function FordelingSide() {
  const { saker, saksbehandlere, saksbehandlerDetaljer } = useLoaderData<typeof loader>();

  return (
    <Page>
      <title>Fordeling – Watson Sak</title>
      <PageBlock width="xl" gutters className="!mx-0">
        <UfordelteSakerInnhold
          saker={saker}
          saksbehandlere={saksbehandlere}
          saksbehandlerDetaljer={saksbehandlerDetaljer}
          submitPath={RouteConfig.FORDELING}
        />
      </PageBlock>
    </Page>
  );
}
