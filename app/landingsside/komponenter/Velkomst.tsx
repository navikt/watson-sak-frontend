import { BodyLong, Heading, VStack } from "@navikt/ds-react";
import { useInnloggetBruker } from "~/auth/innlogget-bruker";
import { hentFornavn, hentHilsen } from "~/utils/hilsen";

export function Velkomst({ oppsummering }: { oppsummering: string }) {
  const bruker = useInnloggetBruker();
  const fornavn = hentFornavn(bruker.name);
  const { tekst, Ikon } = hentHilsen();

  return (
    <div className="rounded-xl bg-ax-bg-accent-soft px-6 py-8">
      <VStack gap="space-4">
        <Heading level="1" size="xlarge">
          {tekst}, {fornavn} <Ikon aria-hidden className="inline" />
        </Heading>
        <BodyLong className="max-w-3xl text-ax-text-neutral-subtle">{oppsummering}</BodyLong>
      </VStack>
    </div>
  );
}
