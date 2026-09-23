import type { KontrollsakResponse, TillatteHandlingerResponse } from "~/saker/types.backend";

type Feltskjema = TillatteHandlingerResponse["feltskjema"];

export function kanAvsluttesFraForvaltning(
  sak: Pick<KontrollsakResponse, "resultat" | "ytelser">,
  feltskjema: Feltskjema,
): boolean {
  const resultat = sak.resultat;
  if (resultat?.forvaltning?.type !== "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE") return false;

  const endeligUtfall =
    resultat.forvaltning.endeligUtfall === undefined
      ? resultat.endeligUtfall
      : resultat.forvaltning.endeligUtfall;
  if (!endeligUtfall || !sak.ytelser.every((ytelse) => ytelse.endeligBelop !== null)) return false;

  const resultatfelt = feltskjema.find((felt) => felt.felt === "forvaltning.endeligUtfall.type");
  if (!resultatfelt?.verdier.some((verdi) => verdi.verdi === endeligUtfall.type)) return false;

  if (endeligUtfall.type === "HENLAGT") {
    const arsakfelt = feltskjema.find(
      (felt) => felt.felt === "forvaltning.endeligUtfall.henleggelsesarsak",
    );
    return (
      arsakfelt?.verdier.some((verdi) => verdi.verdi === endeligUtfall.henleggelsesarsak) ?? false
    );
  }
  return endeligUtfall.henleggelsesarsak == null;
}

export function hentVisbareSteg(
  tillatteHandlinger: TillatteHandlingerResponse,
): TillatteHandlingerResponse["tillatteSteg"] {
  return tillatteHandlinger.tillatteSteg.filter(
    (steg) =>
      steg !== "AVSLUTTET" ||
      tillatteHandlinger.tilstand.steg !== "FORVALTNING" ||
      kanAvsluttesFraForvaltning(tillatteHandlinger.tilstand, tillatteHandlinger.feltskjema),
  );
}
