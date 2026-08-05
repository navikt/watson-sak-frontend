import type { SVGProps } from "react";

/**
 * Egendefinerte tabellikoner – Aksel har ingen for å legge til/slette rader og
 * kolonner. De følger Aksel-konvensjonen: 24×24 viewBox, `currentColor`, skalerer
 * med `fontSize` (1em), og videresender props (f.eks. `aria-hidden`, `className`).
 *
 * Visuell kode: vertikale streker = kolonneoperasjon, horisontale = radoperasjon;
 * pluss = legg til, minus = slett.
 */
function TabellIkon({ children, ...props }: SVGProps<SVGSVGElement>) {
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

const rutenett = (
  <rect x="2.5" y="2.5" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
);
const vertikaleStreker = (
  <>
    <path d="M7.17 2.5V16.5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M11.83 2.5V16.5" stroke="currentColor" strokeWidth="1.6" />
  </>
);
const horisontaleStreker = (
  <>
    <path d="M2.5 7.17H16.5" stroke="currentColor" strokeWidth="1.6" />
    <path d="M2.5 11.83H16.5" stroke="currentColor" strokeWidth="1.6" />
  </>
);
const pluss = (
  <path
    d="M18 14.5V21.5M14.5 18H21.5"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
  />
);
const minus = (
  <path d="M14.5 18H21.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
);
const kryss = (
  <>
    <path d="M14.5 14.5L21.5 21.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <path d="M21.5 14.5L14.5 21.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </>
);

export function LeggTilKolonneIkon(props: SVGProps<SVGSVGElement>) {
  return (
    <TabellIkon {...props}>
      {rutenett}
      {vertikaleStreker}
      {pluss}
    </TabellIkon>
  );
}

export function SlettKolonneIkon(props: SVGProps<SVGSVGElement>) {
  return (
    <TabellIkon {...props}>
      {rutenett}
      {vertikaleStreker}
      {minus}
    </TabellIkon>
  );
}

export function LeggTilRadIkon(props: SVGProps<SVGSVGElement>) {
  return (
    <TabellIkon {...props}>
      {rutenett}
      {horisontaleStreker}
      {pluss}
    </TabellIkon>
  );
}

export function SlettRadIkon(props: SVGProps<SVGSVGElement>) {
  return (
    <TabellIkon {...props}>
      {rutenett}
      {horisontaleStreker}
      {minus}
    </TabellIkon>
  );
}

export function SlettTabellIkon(props: SVGProps<SVGSVGElement>) {
  return (
    <TabellIkon {...props}>
      {rutenett}
      {kryss}
    </TabellIkon>
  );
}
