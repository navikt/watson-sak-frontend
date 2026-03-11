import { BodyShort, Heading, Link, Tag, VStack } from "@navikt/ds-react";
import { ArrowRightIcon } from "@navikt/aksel-icons";
import { Link as RouterLink } from "react-router";
import type { Sak } from "~/saker/typer";
import { RouteConfig } from "~/routeConfig";
import { Kort } from "~/utils/Kort";

function dagerSiden(dato: string): number {
  const nå = new Date();
  const innmeldt = new Date(dato);
  return Math.floor(
    (nå.getTime() - innmeldt.getTime()) / (1000 * 60 * 60 * 24),
  );
}

export function PrioriterteSaker({ saker }: { saker: Sak[] }) {
  return (
    <Kort>
      <VStack gap="space-4">
        <div className="flex items-center justify-between">
          <Heading level="2" size="medium">
            Krever handling
          </Heading>
          <Link as={RouterLink} to={RouteConfig.FORDELING}>
            Fordeling <ArrowRightIcon aria-hidden fontSize="1rem" />
          </Link>
        </div>

        {saker.length === 0 ? (
          <BodyShort className="text-ax-text-neutral-subtle">
            Ingen saker krever handling akkurat nå.
          </BodyShort>
        ) : (
          <VStack as="ul" gap="space-4" className="list-none m-0 p-0">
            {saker.slice(0, 5).map((sak) => {
              const alder = dagerSiden(sak.datoInnmeldt);
              return (
                <li key={sak.id}>
                  <Link
                    as={RouterLink}
                    to={RouteConfig.SAKER_DETALJ.replace(":sakId", sak.id)}
                    className="block rounded-md p-3 no-underline hover:bg-ax-bg-neutral-moderate-hover transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <VStack gap="space-1">
                        <BodyShort size="small" weight="semibold">
                          #{sak.id} – {sak.ytelser[0]}
                        </BodyShort>
                        <BodyShort
                          size="small"
                          className="text-ax-text-neutral-subtle"
                        >
                          {sak.seksjon} · {alder} dager siden
                        </BodyShort>
                      </VStack>
                      <Tag
                        variant={alder > 30 ? "warning" : "info"}
                        size="xsmall"
                      >
                        {alder > 30 ? "Haster" : "Ny"}
                      </Tag>
                    </div>
                  </Link>
                </li>
              );
            })}
          </VStack>
        )}
      </VStack>
    </Kort>
  );
}
