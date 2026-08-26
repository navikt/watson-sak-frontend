import { BodyShort, Detail, Heading, HStack } from "@navikt/ds-react";
import type { ComponentType, ReactNode, SVGProps } from "react";

type FilerRadType = "dokument" | "fil" | "arkivert";

const AKSENTFARGE: Record<FilerRadType, string> = {
  dokument: "bg-ax-bg-accent-strong",
  fil: "bg-ax-bg-neutral-strong",
  arkivert: "bg-ax-bg-success-strong",
};

interface FilerRadProps {
  /** Styrer aksentfargen på den venstre streken, ut fra hvilken underseksjon raden hører til. */
  type: FilerRadType;
  ikon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Tittelen på dokumentet/filen. Kan pakkes inn i en `Link` av kalleren om den skal være klikkbar. */
  tittel: ReactNode;
  /** Valgfritt merke ved siden av tittelen, f.eks. en status-tag. */
  tag?: ReactNode;
  /** Grå metadatalinje under tittelen, f.eks. «2,4 MB · Sist endret 12. jun. 2026 · S. Behandler». */
  metadata: ReactNode;
  /** Handlingsknapper til høyre i raden (åpne, slette, osv.). */
  handlinger?: ReactNode;
}

/**
 * Kompakt rad for et dokument eller en fil i «Filer»-seksjonen på saksdetaljer: en farget
 * aksentstrek, et typeikon, tittel/tag og en grå metadatalinje. Brukes av `DokumentTabell`,
 * `VedleggSeksjon` og `ArkivertSeksjon` for et konsistent utseende på tvers av underseksjonene.
 */
export function FilerRad({ type, ikon: Ikon, tittel, tag, metadata, handlinger }: FilerRadProps) {
  return (
    <li className="border-b border-ax-border-neutral-subtle last:border-b-0">
      <HStack align="center" gap="space-8" wrap={false} className="py-[10px]">
        <span className={`h-10 w-1 shrink-0 rounded-full ${AKSENTFARGE[type]}`} aria-hidden />
        <Ikon aria-hidden className="size-5 shrink-0 text-ax-icon-neutral" />
        <div className="min-w-0 flex-1">
          <HStack align="center" gap="space-2" wrap={false}>
            <BodyShort size="small" weight="semibold" className="truncate">
              {tittel}
            </BodyShort>
            {tag}
          </HStack>
          <Detail className="truncate text-ax-text-neutral-subtle">{metadata}</Detail>
        </div>
        {handlinger && <div className="shrink-0">{handlinger}</div>}
      </HStack>
    </li>
  );
}

/**
 * Liten «caption»-overskrift + forklarende undertekst over en av underseksjonene i «Filer»
 * (Redigerbare dokumenter / Opplastede filer / Arkivert). Fortsatt en semantisk overskrift
 * (nivå 3) for skjermlesernavigasjon, men visuelt liten og grå for å matche skissen.
 */
export function FilerSeksjonCaption({
  tittel,
  undertekst,
}: {
  tittel: string;
  undertekst: string;
}) {
  return (
    <div>
      <Heading
        level="3"
        size="xsmall"
        className="uppercase tracking-wide text-ax-text-neutral-subtle"
      >
        {tittel}
      </Heading>
      <Detail className="text-ax-text-neutral-subtle">{undertekst}</Detail>
    </div>
  );
}
