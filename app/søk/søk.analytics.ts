import { sporHendelse } from "~/analytics/analytics";

export const MORIARTY_EASTER_EGG = "moriarty";
export const SHERLOCK_EASTER_EGG = "sherlock";
export const END_CREDITS_EASTER_EGG = "end credits";

const EASTER_EGGS = new Set([MORIARTY_EASTER_EGG, SHERLOCK_EASTER_EGG, END_CREDITS_EASTER_EGG]);

type SøkeKlassifisering =
  | "Fødsels- eller D-nummer"
  | "Organisasjonsnummer"
  | "Saksnummer"
  | "PID"
  | "Easter egg"
  | "Annet";

type Søkekilde = "hurtigsøk";

export function klassifiserSøk(søketekst: string): SøkeKlassifisering {
  if (EASTER_EGGS.has(søketekst.trim().toLowerCase())) return "Easter egg";

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
