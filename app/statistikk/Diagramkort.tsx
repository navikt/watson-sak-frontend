import { BodyShort, Box, Heading, HStack, VStack } from "@navikt/ds-react";
import type { ReactNode } from "react";

export function Diagramkort({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Box
      as="section"
      aria-label={title}
      borderColor="neutral-subtle"
      borderWidth="1"
      borderRadius="8"
      padding={{ xs: "space-12", md: "space-16" }}
      className={`h-full min-w-0 ${className}`}
    >
      <VStack gap="space-12" className="h-full">
        <div>
          <Heading level="2" size="small">
            {title}
          </Heading>
          {description && <BodyShort size="small">{description}</BodyShort>}
        </div>
        {children}
      </VStack>
    </Box>
  );
}

export function Legend({
  items,
  skjulte,
  onToggle,
}: {
  items: { navn: string; farge: string; verdi?: number }[];
  skjulte?: Set<string>;
  onToggle?: (navn: string) => void;
}) {
  const total = items.reduce((sum, item) => sum + (item.verdi ?? 0), 0);
  return (
    <HStack gap="space-8" wrap>
      {items.map((item) => {
        const skjult = skjulte?.has(item.navn);
        const prosent =
          item.verdi != null && total > 0 ? Math.round((item.verdi / total) * 100) : null;
        return (
          <button
            key={item.navn}
            type="button"
            aria-pressed={onToggle ? Boolean(skjult) : undefined}
            className={`flex items-center gap-1 text-xs ${skjult ? "opacity-40 line-through" : ""}`}
            onClick={() => onToggle?.(item.navn)}
            disabled={!onToggle}
          >
            <span
              aria-hidden
              className="size-2 rounded-sm"
              style={{ backgroundColor: `var(${item.farge})` }}
            />
            {item.navn}
            {item.verdi != null && ` – ${item.verdi}${prosent != null ? ` (${prosent} %)` : ""}`}
          </button>
        );
      })}
    </HStack>
  );
}
