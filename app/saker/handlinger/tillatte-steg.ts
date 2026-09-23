import type { KontrollsakResponse, TillatteHandlingerResponse } from "~/saker/types.backend";

type Feltskjema = TillatteHandlingerResponse["feltskjema"];

function hentForvaltningensEndeligeUtfall(
  resultat: NonNullable<TillatteHandlingerResponse["tilstand"]["resultat"]>,
) {
  return resultat.forvaltning?.endeligUtfall === undefined
    ? resultat.endeligUtfall
    : resultat.forvaltning.endeligUtfall;
}

export function kanAvsluttesFraForvaltning(
  sak: Pick<KontrollsakResponse, "resultat" | "ytelser">,
  feltskjema: Feltskjema,
): boolean {
  const resultat = sak.resultat;
  if (resultat?.forvaltning?.type !== "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE") return false;

  const endeligUtfall = hentForvaltningensEndeligeUtfall(resultat);
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

function erHenlagtIGjeldendeSteg(tilstand: TillatteHandlingerResponse["tilstand"]): boolean {
  const { resultat } = tilstand;
  switch (tilstand.steg) {
    case "UTREDNING":
      return resultat?.utredning?.type === "HENLAGT";
    case "FORVALTNING":
      return (
        resultat?.forvaltning?.type === "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE" &&
        hentForvaltningensEndeligeUtfall(resultat)?.type === "HENLAGT"
      );
    case "STRAFFERETTSLIG_VURDERING":
      return resultat?.strafferettsligVurdering?.type === "HENLAGT";
    case "POLITI":
      return resultat?.politi?.type === "HENLAGT";
    default:
      return false;
  }
}

export function hentVisbareSteg(
  tillatteHandlinger: TillatteHandlingerResponse,
): TillatteHandlingerResponse["tillatteSteg"] {
  const henlagt = erHenlagtIGjeldendeSteg(tillatteHandlinger.tilstand);
  return tillatteHandlinger.tillatteSteg.filter((steg) => {
    if (henlagt && steg !== "AVSLUTTET") return false;
    if (steg === "AVSLUTTET" && tillatteHandlinger.tilstand.steg === "FORVALTNING") {
      return kanAvsluttesFraForvaltning(tillatteHandlinger.tilstand, tillatteHandlinger.feltskjema);
    }
    return true;
  });
}
