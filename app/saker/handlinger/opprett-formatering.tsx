import { BodyShort } from "@navikt/ds-react";

const journalposttypeEtiketter: Record<string, string> = {
  INNGAAENDE: "Inngående",
  UTGAAENDE: "Utgående",
  NOTAT: "Notat",
};

// Reserve for historikken, som ikke henter kodeverket fra Gosys.
const oppgavetypeEtiketter: Record<string, string> = {
  BEH_SAK: "Behandle sak",
  JFR: "Journalføring",
  VUR: "Vurder dokument",
  VURD_BREV: "Vurder brev",
  VURD_HENV: "Vurder henvendelse",
  VUR_KONS_YTE: "Vurder konsekvens for ytelse",
};

const prioritetEtiketter: Record<string, string> = {
  LAV: "Lav",
  NORMAL: "Normal",
  HOY: "Høy",
};

export const prioritetValg = [
  { verdi: "LAV", label: prioritetEtiketter.LAV },
  { verdi: "NORMAL", label: prioritetEtiketter.NORMAL },
  { verdi: "HOY", label: prioritetEtiketter.HOY },
] as const;

export function formaterJournalposttype(type: string): string {
  return journalposttypeEtiketter[type] ?? type;
}

export function formaterOppgavetype(type: string): string {
  return oppgavetypeEtiketter[type] ?? type;
}

export function formaterOppgavePrioritet(prioritet: string): string {
  return prioritetEtiketter[prioritet] ?? prioritet;
}

export function SammendragRad({
  label,
  verdi,
  fremhevet = false,
}: {
  label: string;
  verdi: React.ReactNode;
  /** Viser verdien med halvfet skrift. */
  fremhevet?: boolean;
}) {
  return (
    <>
      <BodyShort size="small" textColor="subtle">
        {label}
      </BodyShort>
      <BodyShort size="small" weight={fremhevet ? "semibold" : "regular"}>
        {verdi}
      </BodyShort>
    </>
  );
}

export function ListeSammendrag({ label, navn }: { label: string; navn: string[] }) {
  return (
    <>
      <BodyShort size="small" textColor="subtle">
        {label}
      </BodyShort>
      {navn.length > 0 ? (
        <BodyShort as="ul" size="small" weight="semibold">
          {navn.map((filnavn, indeks) => (
            <li key={`${filnavn}-${indeks}`}>{filnavn}</li>
          ))}
        </BodyShort>
      ) : (
        <BodyShort size="small" weight="semibold">
          Ingen
        </BodyShort>
      )}
    </>
  );
}
