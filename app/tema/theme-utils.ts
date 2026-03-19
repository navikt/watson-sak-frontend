import type { Preferences } from "~/preferanser/PreferencesCookie";

export function finnAktivtTema(
  tema: Preferences["tema"],
  systemForetrekkerMorktTema: boolean,
): "light" | "dark" {
  if (tema === "system") {
    return systemForetrekkerMorktTema ? "dark" : "light";
  }

  return tema;
}
