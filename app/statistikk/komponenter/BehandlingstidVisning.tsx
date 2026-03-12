import { BodyShort, HGrid, HStack, VStack } from "@navikt/ds-react";
import { Nokkeltallkort } from "./Nokkeltallkort";

interface Behandlingstid {
  min: number;
  median: number;
  gjennomsnitt: number;
  maks: number;
  antall: number;
}

interface Props {
  behandlingstid: Behandlingstid;
}

/** Visuelt spenn-indikator som viser min–maks-range med median- og gjennomsnittsmarkører */
function SpennIndikator({
  min,
  median,
  gjennomsnitt,
  maks,
}: {
  min: number;
  median: number;
  gjennomsnitt: number;
  maks: number;
}) {
  const range = maks - min || 1;
  const medianProsent = ((median - min) / range) * 100;
  const gjennomsnittProsent = ((gjennomsnitt - min) / range) * 100;

  return (
    <div
      role="img"
      aria-label={`Behandlingstid fra ${min} til ${maks} dager. Median: ${median} dager. Gjennomsnitt: ${gjennomsnitt} dager.`}
    >
      <HStack gap="space-2" align="center" className="mb-2">
        <BodyShort size="small" className="text-ax-text-neutral-subtle whitespace-nowrap">
          {min} d
        </BodyShort>
        <div className="relative h-3 flex-1 rounded-full bg-ax-bg-neutral-moderate">
          <div className="absolute inset-0 rounded-full bg-ax-bg-accent-soft" />

          {/* Median-markør */}
          <div
            className="absolute top-1/2 h-5 w-0.5 -translate-y-1/2 rounded bg-ax-icon-accent"
            style={{ left: `${medianProsent}%` }}
            title={`Median: ${median} dager`}
          />

          {/* Gjennomsnitt-markør */}
          <div
            className="absolute top-1/2 h-5 w-0.5 -translate-y-1/2 rounded bg-ax-icon-warning"
            style={{ left: `${gjennomsnittProsent}%` }}
            title={`Gjennomsnitt: ${gjennomsnitt} dager`}
          />
        </div>
        <BodyShort size="small" className="text-ax-text-neutral-subtle whitespace-nowrap">
          {maks} d
        </BodyShort>
      </HStack>

      {/* Tegnforklaring */}
      <HStack gap="space-4" justify="center">
        <HStack gap="space-1" align="center">
          <span className="inline-block h-0.5 w-3 rounded bg-ax-icon-accent" />
          <BodyShort size="small" className="text-ax-text-neutral-subtle">
            Median ({median} d)
          </BodyShort>
        </HStack>
        <HStack gap="space-1" align="center">
          <span className="inline-block h-0.5 w-3 rounded bg-ax-icon-warning" />
          <BodyShort size="small" className="text-ax-text-neutral-subtle">
            Gjennomsnitt ({gjennomsnitt} d)
          </BodyShort>
        </HStack>
      </HStack>
    </div>
  );
}

export function BehandlingstidVisning({ behandlingstid }: Props) {
  const { min, median, gjennomsnitt, maks, antall } = behandlingstid;

  return (
    <VStack gap="space-4">
      <BodyShort className="text-ax-text-neutral-subtle">
        Basert på {antall} avsluttede/henlagte saker
      </BodyShort>

      <SpennIndikator min={min} median={median} gjennomsnitt={gjennomsnitt} maks={maks} />

      <HGrid columns={{ xs: 2, md: 4 }} gap="space-4">
        <Nokkeltallkort tittel="Minimum" verdi={min} enhet="dager" />
        <Nokkeltallkort tittel="Median" verdi={median} enhet="dager" />
        <Nokkeltallkort tittel="Gjennomsnitt" verdi={gjennomsnitt} enhet="dager" />
        <Nokkeltallkort tittel="Maksimum" verdi={maks} enhet="dager" />
      </HGrid>
    </VStack>
  );
}
