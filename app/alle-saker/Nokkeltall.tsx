import { BodyShort } from "@navikt/ds-react";
import type { mockNokkeltall } from "./mock-data.server";

type Props = typeof mockNokkeltall;

export function Nokkeltall({
  pagaendeSaker,
  paVent,
  utredetInnen12Uker,
  utredetInnen15Uker,
  gjennomsnittligSaksbehandlingstid,
}: Props) {
  return (
    <div className="grid grid-cols-2 gap-y-8">
      <StatistikkEnhet verdi={pagaendeSaker} label="Pågående saker" />
      <StatistikkEnhet verdi={paVent} label="På vent" />
      <StatistikkEnhet verdi={utredetInnen12Uker} enhet="%" label="Utredet innenfor 12 uker" />
      <StatistikkEnhet verdi={utredetInnen15Uker} enhet="%" label="Utredet innenfor 15 uker" />
      <div className="col-span-2 flex items-baseline justify-between border-t border-ax-border-neutral-subtle pt-4">
        <BodyShort size="small" className="text-ax-text-neutral-subtle">
          Gjennomsnittlig saksbehandlingstid:
        </BodyShort>
        <span className="text-sm font-semibold">{gjennomsnittligSaksbehandlingstid} dager</span>
      </div>
    </div>
  );
}

function StatistikkEnhet({
  verdi,
  enhet,
  label,
}: {
  verdi: number;
  enhet?: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-baseline gap-1">
        <span className="text-5xl font-semibold">{verdi}</span>
        {enhet && (
          <BodyShort as="span" size="small" className="text-ax-text-neutral-subtle">
            {enhet}
          </BodyShort>
        )}
      </div>
      <BodyShort size="small" className="text-center text-ax-text-neutral-subtle">
        {label}
      </BodyShort>
    </div>
  );
}
