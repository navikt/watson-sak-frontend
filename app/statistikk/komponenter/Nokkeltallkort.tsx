import { BodyShort, Box, HStack, VStack } from "@navikt/ds-react";
import type { ReactNode } from "react";

interface Props {
  tittel: string;
  verdi: number;
  enhet?: string;
  ikon?: ReactNode;
  gap?: "space-4" | "space-6" | "space-8";
}

export function Nokkeltallkort({ tittel, verdi, enhet, ikon, gap = "space-4" }: Props) {
  return (
    <Box padding="space-4" borderRadius="8" background="raised">
      <HStack gap={gap} align="center">
        {ikon && (
          <div className="flex items-center justify-center rounded-lg bg-ax-bg-accent-soft p-2 text-ax-text-accent">
            {ikon}
          </div>
        )}
        <VStack>
          <BodyShort size="small" className="text-ax-text-neutral-subtle">
            {tittel}
          </BodyShort>
          <HStack gap="space-1" align="baseline">
            <span className="text-3xl font-semibold">{verdi}</span>
            {enhet && (
              <BodyShort size="small" className="text-ax-text-neutral-subtle" as="span">
                {enhet}
              </BodyShort>
            )}
          </HStack>
        </VStack>
      </HStack>
    </Box>
  );
}
