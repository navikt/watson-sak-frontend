import type { TransportItem } from "@grafana/faro-react";

const FNR = /\b\d{11}\b/g;

/**
 * 🔴 Fjerner fødselsnummer og query-strenger fra alt Faro sender. Faro har bredere tilgang
 * enn Loki, og både konsollmeldinger, feilmeldinger og URL-er kan inneholde fnr.
 */
export function fjernPersondata(item: TransportItem): TransportItem {
  return vask(item) as TransportItem;
}

function vask(verdi: unknown): unknown {
  if (typeof verdi === "string") return vaskStreng(verdi);
  if (Array.isArray(verdi)) return verdi.map(vask);
  if (verdi && typeof verdi === "object") {
    return Object.fromEntries(Object.entries(verdi).map(([nøkkel, v]) => [nøkkel, vask(v)]));
  }
  return verdi;
}

function vaskStreng(streng: string): string {
  const utenQuery = /^(https?:\/\/|\/)/.test(streng) ? streng.replace(/[?#].*$/, "") : streng;
  return utenQuery.replace(FNR, "***********");
}
