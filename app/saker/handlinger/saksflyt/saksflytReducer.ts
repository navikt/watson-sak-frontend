import type { Feil } from "./validering";
import type { Sakshandling, Verdier } from "./saksflyt";

export type SaksflytTilstand =
  | { fase: "meny"; feil: Feil }
  | {
      fase: "trinn";
      handling: Sakshandling;
      trinnIndeks: number;
      verdier: Verdier;
      feil: Feil;
      /** Om «Tilbake» fra første trinn skal gå til menyen. */
      fraMeny: boolean;
    }
  | { fase: "kvittering" };

export type SaksflytHandling =
  | { type: "velgHandling"; handling: Sakshandling; verdier: Verdier; fraMeny: boolean }
  | { type: "neste" }
  | { type: "tilbake" }
  | { type: "settVerdi"; navn: string; verdi: string }
  | { type: "settFeil"; feil: Feil }
  | { type: "lagret" };

export function saksflytReducer(
  tilstand: SaksflytTilstand,
  handling: SaksflytHandling,
): SaksflytTilstand {
  switch (handling.type) {
    case "velgHandling":
      return {
        fase: "trinn",
        handling: handling.handling,
        trinnIndeks: 0,
        verdier: handling.verdier,
        feil: {},
        fraMeny: handling.fraMeny,
      };
    case "lagret":
      return { fase: "kvittering" };
    case "settFeil":
      return tilstand.fase === "kvittering" ? tilstand : { ...tilstand, feil: handling.feil };
    default:
      break;
  }

  if (tilstand.fase !== "trinn") return tilstand;
  switch (handling.type) {
    case "neste":
      return {
        ...tilstand,
        trinnIndeks: Math.min(tilstand.trinnIndeks + 1, tilstand.handling.trinn.length - 1),
        feil: {},
      };
    case "tilbake":
      if (tilstand.trinnIndeks > 0) {
        return { ...tilstand, trinnIndeks: tilstand.trinnIndeks - 1, feil: {} };
      }
      return tilstand.fraMeny ? { fase: "meny", feil: {} } : tilstand;
    case "settVerdi": {
      const feil = { ...tilstand.feil };
      delete feil[handling.navn];
      delete feil[""];
      return {
        ...tilstand,
        verdier: { ...tilstand.verdier, [handling.navn]: handling.verdi },
        feil,
      };
    }
  }
}

export function lagStarttilstand(
  start: { handling: Sakshandling; verdier: Verdier } | null,
): SaksflytTilstand {
  if (!start) return { fase: "meny", feil: {} };
  return {
    fase: "trinn",
    handling: start.handling,
    trinnIndeks: 0,
    verdier: start.verdier,
    feil: {},
    fraMeny: false,
  };
}
