import { BodyShort, Heading, VStack } from "@navikt/ds-react";
import { useInnloggetBruker } from "~/auth/innlogget-bruker";

function hentHilsen(): string {
  const time = new Date().getHours();
  if (time < 6) return "God natt";
  if (time < 10) return "God morgen";
  if (time < 17) return "God ettermiddag";
  return "God kveld";
}

function hentFornavn(fulltNavn: string): string {
  return fulltNavn.split(" ")[0];
}

interface VelkomstProps {
  antallUnderBehandling: number;
  antallTipsMottatt: number;
}

export function Velkomst({
  antallUnderBehandling,
  antallTipsMottatt,
}: VelkomstProps) {
  const bruker = useInnloggetBruker();
  const fornavn = hentFornavn(bruker.name);

  return (
    <VStack gap="space-2">
      <Heading level="1" size="large">
        {hentHilsen()}, {fornavn} 👋
      </Heading>
      <BodyShort className="text-ax-text-neutral-subtle">
        Du har {antallUnderBehandling} saker under behandling og{" "}
        {antallTipsMottatt} nye tips som venter.
      </BodyShort>
    </VStack>
  );
}
