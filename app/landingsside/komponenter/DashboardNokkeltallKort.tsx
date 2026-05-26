import { BodyShort, Detail, Heading, VStack } from "@navikt/ds-react";
import type { DashboardNokkeltall } from "../dashboard-nokkeltall";

type Farge = "accent" | "success" | "warning" | "neutral" | "meta-purple" | "neutral-subtle";

interface NokkeltallkortProps {
  farge: Farge;
  verdi: string | number;
  suffiks?: string;
  overskrift: string;
  underoverskrift: string;
}

const borderFargeKlasser: Record<Farge, string> = {
  accent: "border-t-ax-border-accent",
  success: "border-t-ax-border-success",
  warning: "border-t-ax-border-warning",
  neutral: "border-t-ax-border-neutral",
  "meta-purple": "border-t-ax-border-meta-purple",
  "neutral-subtle": "border-t-ax-border-neutral-subtle",
};

const tekstFargeKlasser: Record<Farge, string> = {
  accent: "text-ax-text-accent",
  success: "text-ax-text-success",
  warning: "text-ax-text-warning",
  neutral: "text-ax-text-neutral",
  "meta-purple": "text-ax-text-meta-purple",
  "neutral-subtle": "text-ax-text-neutral-subtle",
};

function Nokkeltallkort({
  farge,
  verdi,
  suffiks,
  overskrift,
  underoverskrift,
}: NokkeltallkortProps) {
  return (
    <div
      className={`flex flex-col rounded-lg border border-ax-border-neutral-subtle border-t-4 bg-ax-bg-raised px-5 pb-3 ${borderFargeKlasser[farge]}`}
    >
      <div className="mt-4 mb-3 flex items-center gap-2">
        <span className={`text-4xl font-bold ${tekstFargeKlasser[farge]}`}>{verdi}</span>
        {suffiks && <span className="text-sm text-ax-text-neutral-subtle">{suffiks}</span>}
      </div>
      <div>
        <BodyShort size="small" weight="semibold">
          {overskrift}
        </BodyShort>
        <Detail className="text-ax-text-neutral-subtle">{underoverskrift}</Detail>
      </div>
    </div>
  );
}

interface Props {
  nokkeltall: DashboardNokkeltall;
}

export function DashboardNokkeltallKort({ nokkeltall }: Props) {
  return (
    <section aria-labelledby="nokkeltall-heading">
      <VStack gap="space-4">
        <Heading level="2" size="medium" id="nokkeltall-heading">
          Nøkkeltall
        </Heading>
        <div className="grid grid-cols-2 gap-[38px] md:grid-cols-3 lg:grid-cols-6">
          <Nokkeltallkort
            farge="accent"
            verdi={nokkeltall.totalt}
            overskrift="Totalt"
            underoverskrift="antall saker"
          />
          <Nokkeltallkort
            farge="success"
            verdi={nokkeltall.opprettetIPerioden}
            overskrift="Opprettet"
            underoverskrift="i perioden"
          />
          <Nokkeltallkort
            farge="warning"
            verdi={nokkeltall.aktive}
            overskrift="Aktive"
            underoverskrift="Utredes + Str. vurd."
          />
          <Nokkeltallkort
            farge="neutral"
            verdi={nokkeltall.avsluttetIPerioden}
            overskrift="Avsluttet"
            underoverskrift="i perioden"
          />
          <Nokkeltallkort
            farge="meta-purple"
            verdi={nokkeltall.venterPaAndre}
            overskrift="Venter på andre"
            underoverskrift="Info/Vedtak/Anm."
          />
          <Nokkeltallkort
            farge="neutral-subtle"
            verdi={nokkeltall.eldsteApneSakDager ?? "–"}
            suffiks={nokkeltall.eldsteApneSakDager !== null ? "dager" : undefined}
            overskrift="Eldste åpne sak"
            underoverskrift={
              nokkeltall.eldsteApneSakId ? `#${nokkeltall.eldsteApneSakId}` : "Ingen"
            }
          />
        </div>
      </VStack>
    </section>
  );
}
