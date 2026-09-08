import type { ComponentType, SVGProps } from "react";
import { CoffeeIcon, MoonIcon, SunIcon } from "@navikt/aksel-icons";

export interface Hilsen {
  tekst: string;
  Ikon: ComponentType<SVGProps<SVGSVGElement>>;
}

/** Tidsbasert hilsen brukt i velkomstseksjoner (både saksbehandler- og lederoversikt). */
export function hentHilsen(nå: Date = new Date()): Hilsen {
  const time = nå.getHours();
  if (time < 6) return { tekst: "God natt", Ikon: MoonIcon };
  if (time < 10) return { tekst: "God morgen", Ikon: CoffeeIcon };
  if (time < 17) return { tekst: "God dag", Ikon: SunIcon };
  if (time < 20) return { tekst: "God ettermiddag", Ikon: SunIcon };
  return { tekst: "God kveld", Ikon: MoonIcon };
}

/** Trekker ut fornavnet fra et fullt navn, som kan være på "Etternavn, Fornavn"-format. */
export function hentFornavn(fulltNavn: string): string {
  const navn = fulltNavn.includes(",") ? fulltNavn.split(",")[1] : fulltNavn;

  return navn.trim().split(" ")[0];
}
