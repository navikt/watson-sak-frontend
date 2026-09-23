import type {
  KontrollsakResponse,
  KontrollsakSteg,
  LagreResultatRequest,
  TillatteHandlingerResponse,
} from "~/saker/types.backend";

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
  if (
    !endeligUtfall ||
    (endeligUtfall.type !== "HENLAGT" &&
      !sak.ytelser.every((ytelse) => ytelse.endeligBelop !== null))
  ) {
    return false;
  }

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

export function erHenlagtIGjeldendeSteg(
  tilstand: Pick<TillatteHandlingerResponse["tilstand"], "steg" | "resultat">,
): boolean {
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

export function erNyHenleggelseVedAvslutning(
  tilstand: TillatteHandlingerResponse["tilstand"],
  tilSteg: KontrollsakSteg,
  resultat?: LagreResultatRequest,
): boolean {
  return (
    tilSteg === "AVSLUTTET" &&
    !erHenlagtIGjeldendeSteg(tilstand) &&
    (resultat?.utredning?.type === "HENLAGT" ||
      resultat?.forvaltning?.endeligUtfall?.type === "HENLAGT" ||
      resultat?.strafferettsligVurdering?.type === "HENLAGT")
  );
}

export function manglerEndeligUtfallVedAvslutning(
  tilstand: TillatteHandlingerResponse["tilstand"],
  tilSteg: KontrollsakSteg,
  resultat?: LagreResultatRequest,
): boolean {
  return (
    tilstand.steg === "FORVALTNING" &&
    tilSteg === "AVSLUTTET" &&
    resultat?.forvaltning?.endeligUtfall?.type == null &&
    tilstand.resultat?.forvaltning?.endeligUtfall?.type == null &&
    tilstand.resultat?.endeligUtfall?.type == null
  );
}

export function erPolitiresultatKomplett(
  politi: NonNullable<TillatteHandlingerResponse["tilstand"]["resultat"]>["politi"],
): boolean {
  switch (politi?.type) {
    case "HENLAGT":
    case "FRIFINNELSE":
      return Boolean(politi.begrunnelse?.trim());
    case "DOMFELLELSE":
      return (
        Boolean(politi.domstype?.trim()) &&
        Boolean(politi.varighet?.trim()) &&
        typeof politi.redusertForEmkArtikkel6 === "boolean" &&
        typeof politi.redusertForLangSaksbehandling === "boolean"
      );
    default:
      return politi?.type != null;
  }
}

export function harLagretResultatForOvergang(
  tillatteHandlinger: TillatteHandlingerResponse,
  tilSteg: KontrollsakSteg,
): boolean {
  const { steg, resultat } = tillatteHandlinger.tilstand;
  switch (steg) {
    case "OPPRETTET":
      return true;
    case "UTREDNING":
      return (
        resultat?.utredning?.type != null &&
        (resultat.utredning.type !== "HENLAGT" || resultat.utredning.henleggelsesarsak != null)
      );
    case "FORVALTNING":
      return (
        resultat?.forvaltning?.type != null &&
        (tilSteg !== "AVSLUTTET" ||
          (hentForvaltningensEndeligeUtfall(resultat)?.type != null &&
            (hentForvaltningensEndeligeUtfall(resultat)?.type !== "HENLAGT" ||
              hentForvaltningensEndeligeUtfall(resultat)?.henleggelsesarsak != null)))
      );
    case "STRAFFERETTSLIG_VURDERING":
      return (
        resultat?.strafferettsligVurdering?.type != null &&
        (resultat.strafferettsligVurdering.type !== "HENLAGT" ||
          resultat.strafferettsligVurdering.henleggelsesarsak != null)
      );
    case "POLITI":
      return erPolitiresultatKomplett(resultat?.politi);
    default:
      return false;
  }
}

export function hentVisbareSteg(
  tillatteHandlinger: TillatteHandlingerResponse,
): TillatteHandlingerResponse["tillatteSteg"] {
  const henlagt = erHenlagtIGjeldendeSteg(tillatteHandlinger.tilstand);
  const kandidater = tillatteHandlinger.muligeNesteSteg ?? tillatteHandlinger.tillatteSteg;
  return kandidater.filter((steg) => {
    if (henlagt && steg !== "AVSLUTTET") return false;
    if (steg === "AVSLUTTET" && tillatteHandlinger.tilstand.steg === "FORVALTNING") {
      if (!tillatteHandlinger.tillatteSteg.includes(steg)) {
        const resultat = tillatteHandlinger.tilstand.resultat;
        const utfall = resultat && hentForvaltningensEndeligeUtfall(resultat);
        if (!utfall) return true;
        const resultatfelt = tillatteHandlinger.feltskjema.find(
          (felt) => felt.felt === "forvaltning.endeligUtfall.type",
        );
        return resultatfelt?.verdier.some((verdi) => verdi.verdi === utfall.type) ?? false;
      }
      return kanAvsluttesFraForvaltning(tillatteHandlinger.tilstand, tillatteHandlinger.feltskjema);
    }
    return true;
  });
}
