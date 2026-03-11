import { BodyShort, Heading, HGrid, VStack } from "@navikt/ds-react";
import { FolderIcon, TasklistIcon, PlusCircleIcon, BarChartIcon } from "@navikt/aksel-icons";
import { Link } from "react-router";
import { RouteConfig } from "~/routeConfig";
import type { ReactNode } from "react";
import { Kort } from "~/utils/Kort";

const lenker = [
  {
    to: RouteConfig.MINE_SAKER,
    tittel: "Mine saker",
    beskrivelse: "Se og administrer dine tildelte saker",
    ikon: <FolderIcon aria-hidden fontSize="1.5rem" />,
  },
  {
    to: RouteConfig.FORDELING,
    tittel: "Fordeling",
    beskrivelse: "Fordel innkomne saker til saksbehandlere",
    ikon: <TasklistIcon aria-hidden fontSize="1.5rem" />,
  },
  {
    to: RouteConfig.REGISTRER_SAK,
    tittel: "Registrer sak",
    beskrivelse: "Opprett en ny sak i systemet",
    ikon: <PlusCircleIcon aria-hidden fontSize="1.5rem" />,
  },
  {
    to: RouteConfig.STATISTIKK,
    tittel: "Statistikk",
    beskrivelse: "Se statistikk og rapporter for avdelingen",
    ikon: <BarChartIcon aria-hidden fontSize="1.5rem" />,
  },
];

export function Hurtiglenker() {
  return (
    <section aria-labelledby="hurtiglenker-heading">
      <Heading level="2" size="medium" spacing id="hurtiglenker-heading" className="sr-only">
        Hurtiglenker
      </Heading>
      <HGrid columns={{ xs: 2, md: 4 }} gap="space-4">
        {lenker.map((lenke) => (
          <Hurtiglenke key={lenke.to} {...lenke} />
        ))}
      </HGrid>
    </section>
  );
}

function Hurtiglenke({
  to,
  tittel,
  beskrivelse,
  ikon,
}: {
  to: string;
  tittel: string;
  beskrivelse: string;
  ikon: ReactNode;
}) {
  return (
    <Link to={to} className="no-underline">
      <Kort className="h-full transition-shadow hover:shadow-md">
        <VStack gap="space-2">
          <span className="text-ax-text-accent">{ikon}</span>
          <BodyShort weight="semibold">{tittel}</BodyShort>
          <BodyShort size="small" className="text-ax-text-neutral-subtle">
            {beskrivelse}
          </BodyShort>
        </VStack>
      </Kort>
    </Link>
  );
}
