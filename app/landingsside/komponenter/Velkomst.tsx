import { BodyLong, Heading, VStack } from "@navikt/ds-react";
import { CoffeeIcon, MoonIcon, SunIcon } from "@navikt/aksel-icons";
import type { ComponentType, SVGProps } from "react";
import { useInnloggetBruker } from "~/auth/innlogget-bruker";

interface Hilsen {
  tekst: string;
  Ikon: ComponentType<SVGProps<SVGSVGElement>>;
}

function hentHilsen(): Hilsen {
  const time = new Date().getHours();
  if (time < 6) return { tekst: "God natt", Ikon: MoonIcon };
  if (time < 10) return { tekst: "God morgen", Ikon: CoffeeIcon };
  if (time < 17) return { tekst: "God dag", Ikon: SunIcon };
  if (time < 20) return { tekst: "God ettermiddag", Ikon: SunIcon };
  return { tekst: "God kveld", Ikon: MoonIcon };
}

function hentFornavn(fulltNavn: string): string {
  return fulltNavn.split(" ")[0];
}

interface VelkomstProps {
  antallUnderBehandling: number;
  antallTipsMottatt: number;
}

export function Velkomst({ antallUnderBehandling, antallTipsMottatt }: VelkomstProps) {
  const bruker = useInnloggetBruker();
  const fornavn = hentFornavn(bruker.name);
  const { tekst, Ikon } = hentHilsen();

  return (
    <VStack gap="space-4" className="rounded-xl bg-ax-bg-neutral-moderate px-6 py-8">
      <Heading level="1" size="xlarge">
        {tekst}, {fornavn} <Ikon aria-hidden className="inline" />
      </Heading>
      <BodyLong size="large" className="text-ax-text-neutral-subtle">
        Du har {antallUnderBehandling} saker under behandling og {antallTipsMottatt} nye tips som
        venter.
      </BodyLong>
    </VStack>
  );
}
