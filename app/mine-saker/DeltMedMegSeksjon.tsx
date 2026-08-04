import { Heading, HStack, VStack } from "@navikt/ds-react";
import { PersonGroupIcon } from "@navikt/aksel-icons";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { mapKontrollsakTilSakslisteRad } from "~/saker/saksliste/adaptere";
import { Saksliste } from "~/saker/saksliste/Saksliste";
import { RouteConfig } from "~/routeConfig";

type Props = {
  saker: KontrollsakResponse[];
  detaljSti: string;
};

export function DeltMedMegSeksjon({ saker, detaljSti }: Props) {
  if (saker.length === 0) return null;

  return (
    <section aria-labelledby="delt-med-meg-overskrift">
      <VStack gap="space-6">
        <HStack gap="space-4" align="center">
          <PersonGroupIcon aria-hidden fontSize="1.25rem" />
          <Heading id="delt-med-meg-overskrift" level="2" size="medium">
            Delt med meg
          </Heading>
        </HStack>
        <Saksliste
          rader={saker.map((sak) => mapKontrollsakTilSakslisteRad(sak, detaljSti))}
          tomTekst="Ingen saker er delt med deg."
          tilbake={{ to: RouteConfig.MINE_SAKER, label: "Mine saker" }}
        />
      </VStack>
    </section>
  );
}
