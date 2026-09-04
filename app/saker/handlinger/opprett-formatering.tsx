import { BodyShort } from "@navikt/ds-react";

const journalposttypeEtiketter: Record<string, string> = {
  INNGAAENDE: "Inngående",
  UTGAAENDE: "Utgående",
  NOTAT: "Notat",
};

const oppgavetypeEtiketter: Record<string, string> = {
  VUR: "Vurder dokument",
  VURD_HENV: "Vurder henvendelse",
  VUR_KONS_YTE: "Vurder konsekvens for ytelse",
};

const prioritetEtiketter: Record<string, string> = {
  LAV: "Lav",
  NORMAL: "Normal",
  HOY: "Høy",
};

export const oppgavetypeValg = [
  { verdi: "VUR", label: oppgavetypeEtiketter.VUR },
  { verdi: "VURD_HENV", label: oppgavetypeEtiketter.VURD_HENV },
  { verdi: "VUR_KONS_YTE", label: oppgavetypeEtiketter.VUR_KONS_YTE },
] as const;

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

export function SammendragRad({ label, verdi }: { label: string; verdi: React.ReactNode }) {
  return (
    <>
      <BodyShort size="small" textColor="subtle">
        {label}
      </BodyShort>
      <BodyShort size="small">{verdi}</BodyShort>
    </>
  );
}
