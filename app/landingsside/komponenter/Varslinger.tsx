import { BodyShort, Heading, VStack } from "@navikt/ds-react";
import { BellIcon, PersonIcon, ClockIcon } from "@navikt/aksel-icons";
import type { ReactNode } from "react";
import { Kort } from "~/komponenter/Kort";

interface Varsling {
  id: string;
  tekst: string;
  tidspunkt: string;
  ikon: ReactNode;
}

const mockVarslinger: Varsling[] = [
  {
    id: "v1",
    tekst: "Sak #S-301 har blitt tildelt deg",
    tidspunkt: "I dag, 09:15",
    ikon: <PersonIcon aria-hidden fontSize="1.25rem" />,
  },
  {
    id: "v2",
    tekst: "Frist for sak #S-304 utløper snart",
    tidspunkt: "I dag, 08:30",
    ikon: <ClockIcon aria-hidden fontSize="1.25rem" />,
  },
  {
    id: "v3",
    tekst: "Ny kommentar på sak #S-302",
    tidspunkt: "I går, 16:45",
    ikon: <BellIcon aria-hidden fontSize="1.25rem" />,
  },
];

export function Varslinger() {
  return (
    <Kort as="section">
      <VStack gap="space-4">
        <Heading level="2" size="medium">
          Varslinger
        </Heading>

        <VStack as="ul" gap="space-4" className="list-none m-0 p-0">
          {mockVarslinger.map((varsling) => (
            <li
              key={varsling.id}
              className="flex items-start gap-3 rounded-md p-3 bg-ax-bg-neutral-soft"
            >
              <span className="mt-0.5 text-ax-text-neutral-subtle">{varsling.ikon}</span>
              <VStack gap="space-1">
                <BodyShort size="small">{varsling.tekst}</BodyShort>
                <BodyShort size="small" className="text-ax-text-neutral-subtle">
                  {varsling.tidspunkt}
                </BodyShort>
              </VStack>
            </li>
          ))}
        </VStack>

        <BodyShort size="small" className="text-ax-text-neutral-subtle text-center">
          Varslinger er en kommende funksjon
        </BodyShort>
      </VStack>
    </Kort>
  );
}
