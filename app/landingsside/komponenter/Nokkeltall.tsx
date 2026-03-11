import { BodyShort, Box, Heading, HGrid, VStack } from "@navikt/ds-react";
import {
  BulletListIcon,
  EnvelopeClosedIcon,
  CheckmarkCircleIcon,
  MagnifyingGlassIcon,
} from "@navikt/aksel-icons";
import type { ReactNode } from "react";

interface NøkkeltallData {
  totalt: number;
  tipsMottatt: number;
  underUtredning: number;
  avsluttet: number;
}

export function Nokkeltall({ data }: { data: NøkkeltallData }) {
  return (
    <section aria-labelledby="nøkkeltall-heading">
      <Heading
        level="2"
        size="medium"
        spacing
        id="nøkkeltall-heading"
        className="sr-only"
      >
        Nøkkeltall
      </Heading>
      <HGrid columns={{ xs: 2, md: 4 }} gap="space-4">
        <NøkkeltallKort
          tittel="Totalt antall saker"
          verdi={data.totalt}
          ikon={<BulletListIcon aria-hidden fontSize="1.5rem" />}
        />
        <NøkkeltallKort
          tittel="Tips mottatt"
          verdi={data.tipsMottatt}
          ikon={<EnvelopeClosedIcon aria-hidden fontSize="1.5rem" />}
        />
        <NøkkeltallKort
          tittel="Under utredning"
          verdi={data.underUtredning}
          ikon={<MagnifyingGlassIcon aria-hidden fontSize="1.5rem" />}
        />
        <NøkkeltallKort
          tittel="Avsluttet"
          verdi={data.avsluttet}
          ikon={<CheckmarkCircleIcon aria-hidden fontSize="1.5rem" />}
        />
      </HGrid>
    </section>
  );
}

function NøkkeltallKort({
  tittel,
  verdi,
  ikon,
}: {
  tittel: string;
  verdi: number;
  ikon: ReactNode;
}) {
  return (
    <Box
      padding="space-6"
      borderRadius="8"
      borderWidth="1"
      borderColor="neutral-subtle"
      background="raised"
    >
      <VStack gap="space-2">
        <div className="flex items-center gap-2 text-ax-text-neutral-subtle">
          {ikon}
          <BodyShort size="small">{tittel}</BodyShort>
        </div>
        <span className="text-3xl font-semibold">{verdi}</span>
      </VStack>
    </Box>
  );
}
