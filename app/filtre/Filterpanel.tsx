import type { ReactNode } from "react";

interface FilterpanelProps {
  children: ReactNode;
}

/**
 * Responsiv layout for filtergrupper.
 * Viser filtre horisontalt med wrapping på små skjermer,
 * og vertikalt i en kolonne på xl+.
 */
export function Filterpanel({ children }: FilterpanelProps) {
  return <div className="flex flex-wrap gap-6 xl:flex-col xl:flex-nowrap xl:gap-5">{children}</div>;
}
