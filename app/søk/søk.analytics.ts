import { sporHendelse } from "~/analytics/analytics";

type SøkeKlassifisering =
  | "Fødsels- eller D-nummer"
  | "Organisasjonsnummer"
  | "Saksnummer"
  | "PID"
  | "Annet";

type Søkekilde = "hurtigsøk";

export function klassifiserSøk(søketekst: string): SøkeKlassifisering {
  const utenMellomrom = søketekst.replace(/\s+/g, "");
  if (!/^[0-9]+$/.test(utenMellomrom)) return "Annet";
  if (utenMellomrom.length === 11) return "Fødsels- eller D-nummer";
  if (utenMellomrom.length === 9) return "Organisasjonsnummer";
  if (utenMellomrom.length >= 1 && utenMellomrom.length <= 4) return "Saksnummer";
  if (utenMellomrom.length === 5) return "PID";
  return "Annet";
}

export const søkAnalytics = {
  utført(kilde: Søkekilde, søketekst: string) {
    sporHendelse("søk utført", { kilde, klassifisering: klassifiserSøk(søketekst) });
  },
};
