import type { SVGProps } from "react";

/**
 * Egendefinerte verktøylinje-ikoner – Aksel har ingen for indentering.
 * De følger Aksel-konvensjonen: 24×24 viewBox, `currentColor`, skalerer
 * med `fontSize` (1em), og videresender props (f.eks. `aria-hidden`, `className`).
 */
function VerktøylinjeIkon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      focusable="false"
      role="img"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IndenterIkon(props: SVGProps<SVGSVGElement>) {
  return (
    <VerktøylinjeIkon {...props}>
      <path d="M10 7H21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 12H21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 17H21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M3 9.5L6.5 12L3 14.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </VerktøylinjeIkon>
  );
}

export function AvindenterIkon(props: SVGProps<SVGSVGElement>) {
  return (
    <VerktøylinjeIkon {...props}>
      <path d="M10 7H21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 12H21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 17H21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M6.5 9.5L3 12L6.5 14.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </VerktøylinjeIkon>
  );
}
