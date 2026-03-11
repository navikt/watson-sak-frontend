import { BodyShort, Heading, HGrid, VStack } from "@navikt/ds-react";
import type { SakStatus } from "~/saker/typer";
import { Kort } from "~/komponenter/Kort";

interface BehandlingstidData {
  min: number;
  median: number;
  gjennomsnitt: number;
  maks: number;
  antall: number;
}

interface AvdelingsstatistikkProps {
  antallPerStatus: Record<SakStatus, number>;
  behandlingstid: BehandlingstidData | null;
}

export function Avdelingsstatistikk({ antallPerStatus, behandlingstid }: AvdelingsstatistikkProps) {
  const totalt = Object.values(antallPerStatus).reduce((a, b) => a + b, 0);

  return (
    <Kort as="section">
      <VStack gap="space-4">
        <Heading level="2" size="medium">
          Avdelingsstatistikk
        </Heading>

        <HGrid columns={{ xs: 2, md: 4 }} gap="space-4">
          {Object.entries(antallPerStatus).map(([status, antall]) => {
            const prosentandel = totalt > 0 ? Math.round((antall / totalt) * 100) : 0;
            return (
              <VStack key={status} gap="space-1">
                <BodyShort size="small" className="text-ax-text-neutral-subtle capitalize">
                  {status}
                </BodyShort>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-semibold">{antall}</span>
                  <BodyShort size="small" className="text-ax-text-neutral-subtle">
                    ({prosentandel} %)
                  </BodyShort>
                </div>
                <div className="h-1.5 w-full rounded-full bg-ax-bg-neutral-soft">
                  <div
                    className="h-1.5 rounded-full bg-ax-bg-accent-soft transition-all"
                    style={{ width: `${prosentandel}%` }}
                  />
                </div>
              </VStack>
            );
          })}

          {behandlingstid && (
            <VStack gap="space-1">
              <BodyShort size="small" className="text-ax-text-neutral-subtle">
                Median behandlingstid
              </BodyShort>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-semibold">{behandlingstid.median}</span>
                <BodyShort size="small" className="text-ax-text-neutral-subtle">
                  dager
                </BodyShort>
              </div>
            </VStack>
          )}
        </HGrid>
      </VStack>
    </Kort>
  );
}
