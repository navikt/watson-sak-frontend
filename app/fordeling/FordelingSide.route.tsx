import { Heading, Page } from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { useLoaderData } from "react-router";
import { SaksListe } from "~/saker/SaksListe";
import { RouteConfig } from "~/routeConfig";
import { mockSaker } from "./mock-data.server";
import { SakHandlinger } from "./SakHandlinger";
import { mockSaksbehandlere } from "~/saker/mock-saksbehandlere.server";
import { mockSeksjoner } from "~/saker/mock-seksjoner.server";

export function loader() {
  return {
    saker: mockSaker,
    saksbehandlere: mockSaksbehandlere,
    seksjoner: mockSeksjoner,
  };
}

export default function FordelingSide() {
  const { saker, saksbehandlere, seksjoner } = useLoaderData<typeof loader>();

  return (
    <Page>
      <title>Saker til fordeling – Watson Sak</title>
      <PageBlock width="lg" gutters>
        <Heading level="1" size="large" spacing className="mt-4">
          Saker til fordeling
        </Heading>

        <SaksListe
          saker={saker}
          detaljSti={RouteConfig.SAKER_DETALJ.replace("/:sakId", "")}
          handlinger={(sak) => (
            <SakHandlinger
              sak={sak}
              saksbehandlere={saksbehandlere}
              seksjoner={seksjoner}
            />
          )}
        />
      </PageBlock>
    </Page>
  );
}
