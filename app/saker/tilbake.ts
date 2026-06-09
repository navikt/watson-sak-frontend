import { useLocation } from "react-router";

/** Et navigasjonsmål for «tilbake»-knapper: hvor man skal, og hva det heter. */
export type Tilbakemål = { to: string; label: string };

/** Form på `location.state` når et opphav følger med en navigasjon til en sak. */
type TilbakeState = { tilbake?: Tilbakemål };

function erTilbakemål(verdi: unknown): verdi is Tilbakemål {
  return (
    typeof verdi === "object" &&
    verdi !== null &&
    typeof (verdi as Tilbakemål).to === "string" &&
    typeof (verdi as Tilbakemål).label === "string"
  );
}

/**
 * Leser opphavet en sak ble åpnet fra (`location.state.tilbake`) slik at en
 * «tilbake»-knapp kan føre brukeren dit de kom fra. Faller tilbake til `standard`
 * når opphavet mangler – f.eks. ved direkte URL-åpning eller full sideoppdatering.
 */
export function useTilbakeLenke(standard: Tilbakemål): Tilbakemål {
  const location = useLocation();
  const tilbake = (location.state as TilbakeState | null)?.tilbake;
  return erTilbakemål(tilbake) ? tilbake : standard;
}
