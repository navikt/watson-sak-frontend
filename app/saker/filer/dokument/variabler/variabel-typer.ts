export type VariabelId =
  | "navn"
  | "fødselsnummer"
  | "saksnummer"
  | "saksbehandler"
  | "avdeling"
  | "dagens-dato";

export type VariabelDefinisjon = {
  id: VariabelId;
  etikett: string;
  beskrivelse: string;
};

/** Variablene som alltid kan settes inn i et dokument. */
export const STANDARD_VARIABLER: VariabelDefinisjon[] = [
  { id: "navn", etikett: "Navn", beskrivelse: "Brukerens fulle navn" },
  { id: "fødselsnummer", etikett: "Fødselsnummer", beskrivelse: "11 siffer" },
  { id: "saksnummer", etikett: "Saksnummer", beskrivelse: "Kontrollsakens nummer" },
  { id: "saksbehandler", etikett: "Saksbehandler", beskrivelse: "Innlogget behandler" },
  { id: "avdeling", etikett: "Avdeling", beskrivelse: "Enheten registrert på saken" },
  { id: "dagens-dato", etikett: "Dagens dato", beskrivelse: "dd.mm.åååå" },
];

export type VariabelVerdier = Partial<Record<VariabelId, string>>;

export function finnVariabel(id: VariabelId): VariabelDefinisjon | undefined {
  return STANDARD_VARIABLER.find((variabel) => variabel.id === id);
}
