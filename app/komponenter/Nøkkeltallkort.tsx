import { ChevronRightCircleIcon } from "@navikt/aksel-icons";
import { Box, Detail, Heading, VStack } from "@navikt/ds-react";
import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router";
import { formaterDesimaltall } from "~/utils/number-utils";

type Nøkkeltallfarge =
  | "accent"
  | "warning"
  | "danger"
  | "success"
  | "neutral"
  | "info"
  | "meta-purple";

interface NøkkeltallkortProps {
  verdi: ReactNode;
  etikett: string;
  forklaring: string;
  farge: Nøkkeltallfarge;
  /** Gjør hele kortet til en lenke */
  lenke?: string | null;
}

/** Kort med farget toppstripe, et stort tall og en forklarende etikett. */
export function Nøkkeltallkort({ verdi, etikett, forklaring, farge, lenke }: NøkkeltallkortProps) {
  const kort = (
    <Box
      background="default"
      data-color={farge}
      borderColor="neutral-subtle"
      borderWidth="1"
      borderRadius="8"
      paddingInline="space-16"
      paddingBlock="space-12"
      style={{ borderTopColor: `var(--ax-border-${farge})` }}
      className={`relative h-full border-t-4 ${
        lenke ? "transition-colors hover:border-ax-border-accent" : ""
      }`}
    >
      <VStack gap="space-12">
        <Heading
          as="p"
          size="medium"
          textColor="subtle"
          data-color={farge}
          style={lenke ? { maxWidth: "calc(100% - var(--ax-space-32))" } : undefined}
        >
          {typeof verdi === "number" ? formaterDesimaltall(verdi, 0, 20) : verdi}
        </Heading>
        <div>
          <Detail weight="semibold" data-color="neutral">
            {etikett}
          </Detail>
          <Detail textColor="subtle" data-color="neutral">
            {forklaring}
          </Detail>
        </div>
      </VStack>
      {lenke && (
        <span className="absolute top-[var(--ax-space-12)] right-[var(--ax-space-16)] text-ax-text-neutral">
          <ChevronRightCircleIcon fontSize="1.5rem" aria-hidden="true" />
        </span>
      )}
    </Box>
  );

  return lenke ? (
    <RouterLink
      to={lenke}
      className="block h-full rounded-[var(--ax-radius-8)] text-ax-text-neutral no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ax-border-focus"
    >
      {kort}
    </RouterLink>
  ) : (
    kort
  );
}
