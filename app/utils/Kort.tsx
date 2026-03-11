import { Box, type BoxProps } from "@navikt/ds-react";
import type { ReactNode } from "react";

interface KortProps {
  children: ReactNode;
  /** Padding inne i kortet. Standard: `space-8` */
  padding?: BoxProps["padding"];
  /** Klassenavn for ekstra styling */
  className?: string;
}

/** Gjenbrukbart kort med avrundede hjørner, ramme og hevet bakgrunn. */
export function Kort({
  children,
  padding = "space-8",
  className,
}: KortProps) {
  return (
    <Box
      padding={padding}
      borderRadius="8"
      borderWidth="1"
      borderColor="neutral-subtle"
      background="raised"
      className={className}
    >
      {children}
    </Box>
  );
}
