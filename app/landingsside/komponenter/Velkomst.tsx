import { BodyShort, Box, Heading, VStack } from "@navikt/ds-react";
import { useInnloggetBruker } from "~/auth/innlogget-bruker";
import { hentFornavn, hentHilsen } from "~/utils/hilsen";

export function Velkomst({ oppsummering }: { oppsummering: string }) {
  const bruker = useInnloggetBruker();
  const fornavn = hentFornavn(bruker.name);
  const { tekst, Ikon } = hentHilsen();

  return (
    <Box
      background="accent-soft"
      borderRadius="16"
      paddingBlock="space-16 space-24"
      paddingInline="space-16"
    >
      <VStack gap="space-8">
        <Heading level="1" size="small">
          {tekst}, {fornavn} <Ikon aria-hidden className="inline" />
        </Heading>
        <BodyShort size="medium" className="max-w-3xl text-ax-text-neutral">
          {oppsummering}
        </BodyShort>
      </VStack>
    </Box>
  );
}
