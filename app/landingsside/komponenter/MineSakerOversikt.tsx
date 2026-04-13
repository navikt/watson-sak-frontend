import { Heading, HStack, Link, VStack } from "@navikt/ds-react";
import { ArrowRightIcon, FilesIcon } from "@navikt/aksel-icons";
import { Link as RouterLink } from "react-router";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { RouteConfig } from "~/routeConfig";
import { Kort } from "~/komponenter/Kort";
import { mapKontrollsakTilSakslisteRad } from "~/saker/saksliste/adaptere";
import { Saksliste } from "~/saker/saksliste/Saksliste";

export function MineSakerOversikt({ saker }: { saker: KontrollsakResponse[] }) {
  const rader = saker.map((sak) => mapKontrollsakTilSakslisteRad(sak));

  return (
    <Kort as="section">
      <VStack gap="space-4">
        <HStack justify="space-between" align="center">
          <HStack gap="space-4" align="center">
            <FilesIcon aria-hidden fontSize="1.25rem" />
            <Heading level="2" size="medium">
              Mine saker
            </Heading>
          </HStack>
          <Link as={RouterLink} to={RouteConfig.MINE_SAKER}>
            Se alle <ArrowRightIcon aria-hidden fontSize="1rem" />
          </Link>
        </HStack>

        <Saksliste rader={rader} tomTekst="Du har ingen aktive saker." />
      </VStack>
    </Kort>
  );
}
