import { HGrid, Page, VStack } from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { useLoaderData } from "react-router";
import type { loader } from "./loader.server";
import { Velkomst } from "./komponenter/Velkomst";
import { Nokkeltall } from "./komponenter/Nokkeltall";
import { MineSakerOversikt } from "./komponenter/MineSakerOversikt";
import { PrioriterteSaker } from "./komponenter/PrioriterteSaker";
import { Varslinger } from "./komponenter/Varslinger";
import { Avdelingsstatistikk } from "./komponenter/Avdelingsstatistikk";
import { Hurtiglenker } from "./komponenter/Hurtiglenker";

export { loader } from "./loader.server";

export default function LandingSide() {
  const data = useLoaderData<typeof loader>();

  return (
    <Page>
      <title>Dashboard – Watson Sak</title>
      <PageBlock width="lg" gutters>
        <VStack gap="space-16" className="mt-4 mb-8">
          <Velkomst
            antallUnderBehandling={data.nøkkeltall.underUtredning}
            antallTipsMottatt={data.nøkkeltall.tipsMottatt}
          />

          <Nokkeltall data={data.nøkkeltall} />

          <HGrid columns={{ xs: 1, md: "2fr 1fr" }} gap="space-8">
            <MineSakerOversikt saker={data.mineSaker} />
            <VStack gap="space-8">
              <PrioriterteSaker saker={data.prioriterteSaker} />
              <Varslinger />
            </VStack>
          </HGrid>

          <Avdelingsstatistikk
            antallPerStatus={data.antallPerStatus}
            behandlingstid={data.behandlingstid}
          />

          <Hurtiglenker />
        </VStack>
      </PageBlock>
    </Page>
  );
}
