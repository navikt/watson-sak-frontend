import { Box, type BoxProps } from "@navikt/ds-react";
import type { ElementType, ReactNode } from "react";

interface KortProps {
  children: ReactNode;
  /** HTML-element kortet rendres som. Standard: `div` */
  as?: ElementType;
  /** Padding inne i kortet. Standard: `space-8` */
  padding?: BoxProps["padding"];
  /** Klassenavn for ekstra styling */
  className?: string;
}

const standardProps = {
  borderRadius: "8" as const,
  borderWidth: "1" as const,
  borderColor: "neutral-subtle" as const,
  background: "raised" as const,
};

/** Gjenbrukbart kort med avrundede hjørner, ramme og hevet bakgrunn. */
export function Kort({
  children,
  as,
  padding = "space-8",
  className,
}: KortProps) {
  if (as) {
    return (
      <Box as={as} padding={padding} className={className} {...standardProps}>
        {children}
      </Box>
    );
  }

  return (
    <Box padding={padding} className={className} {...standardProps}>
      {children}
    </Box>
  );
}
