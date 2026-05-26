import { HStack, Tag, Tooltip } from "@navikt/ds-react";
import type { ReactNode } from "react";

type TagOverflowProps = {
  tags: string[];
  /** Innhold som vises når listen er tom */
  tomInnhold?: ReactNode;
};

/**
 * Viser den første tag-en og en grå "+N"-badge med tooltip for resten.
 * Gjenbrukbar for misbrukstyper, merkinger osv.
 */
export function TagOverflow({ tags, tomInnhold = "–" }: TagOverflowProps) {
  if (tags.length === 0) {
    return tomInnhold;
  }

  const [første, ...resten] = tags;

  return (
    <HStack gap="space-4" wrap={false} align="center">
      <Tag variant="outline" data-color="info" size="small">
        {første}
      </Tag>
      {resten.length > 0 && (
        <Tooltip content={resten.join(", ")}>
          <Tag variant="neutral" size="small">
            +{resten.length}
          </Tag>
        </Tooltip>
      )}
    </HStack>
  );
}
