import { BodyShort, Heading, HStack, VStack, Link } from "@navikt/ds-react";
import { CheckmarkCircleIcon, ExclamationmarkTriangleIcon } from "@navikt/aksel-icons";
import { Link as RouterLink } from "react-router";
import { Kort } from "~/komponenter/Kort";
import type { LederAdvarsel } from "../velkomst";

/** Viser advarsler for enheten (saker over frist, ufordelte saker), eller en
 * bekreftelse på at alt er i orden når det ikke finnes noen advarsler. */
export function AdvarslerLeder({ advarsler }: { advarsler: LederAdvarsel[] }) {
  return (
    <Kort as="section">
      <VStack gap="space-4">
        <HStack gap="space-4" align="center">
          <ExclamationmarkTriangleIcon aria-hidden fontSize="1.25rem" />
          <Heading level="2" size="medium">
            Advarsler
          </Heading>
        </HStack>

        {advarsler.length === 0 ? (
          <HStack gap="space-2" align="center" className="text-ax-text-success-decoration">
            <CheckmarkCircleIcon aria-hidden fontSize="1.25rem" />
            <BodyShort>Ingen saker er over frist eller ufordelt i enheten.</BodyShort>
          </HStack>
        ) : (
          <VStack gap="space-4" as="ul" className="list-none p-0 m-0">
            {advarsler.map((advarsel) => (
              <HStack
                key={advarsel.id}
                as="li"
                gap="space-4"
                align="center"
                justify="space-between"
                className="rounded-md bg-ax-bg-warning-soft px-4 py-3"
              >
                <BodyShort>{advarsel.tekst}</BodyShort>
                <Link as={RouterLink} to={advarsel.lenke.to}>
                  {advarsel.lenke.label}
                </Link>
              </HStack>
            ))}
          </VStack>
        )}
      </VStack>
    </Kort>
  );
}
