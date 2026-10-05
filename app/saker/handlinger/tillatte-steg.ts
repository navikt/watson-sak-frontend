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
  sak: Pick<KontrollsakResponse, "resultat">,
  feltskjema: Feltskjema,
): boolean {
  const resultat = sak.resultat;
  if (resultat?.forvaltning?.type !== "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE") return false;

  const endeligUtfall = hentForvaltningensEndeligeUtfall(resultat);
  if (!endeligUtfall) return false;

  const resultatfelt = feltskjema.find((felt) => felt.felt === "forvaltning.endeligUtfall.type");
  if (!resultatfelt?.verdier.some((verdi) => verdi.verdi === endeligUtfall.type)) return false;

  // Henleggelse i forvaltningen har ingen årsak. Eldre saker kan ha en lagret årsak.
  return endeligUtfall.type === "HENLAGT" || endeligUtfall.henleggelsesarsak == null;
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
      return politi.henleggelsesarsak != null || Boolean(politi.begrunnelse?.trim());
    case "FRIFINNELSE":
      return Boolean(politi.begrunnelse?.trim());
    case "DOMFELLELSE":
      return (
        politi.belopTilbakekrevd != null &&
        typeof politi.strafferabatt === "boolean" &&
        (politi.strafferabatt === false || politi.strafferabattProsent != null) &&
        Boolean(politi.domsdato)
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
        (tilSteg === "FORVALTNING"
          ? resultat.utredning.type === "FEILUTBETALINGSSAK_ORDINAER" ||
            resultat.utredning.type === "FEILUTBETALINGSSAK_POTENSIELL_STRAFFESAK"
          : resultat.utredning.type === "KONTROLLNOTAT" || resultat.utredning.type === "HENLAGT") &&
        (resultat.utredning.type !== "HENLAGT" || resultat.utredning.henleggelsesarsak != null)
      );
    case "FORVALTNING":
      if (tilSteg === "STRAFFERETTSLIG_VURDERING") {
        return resultat?.forvaltning?.type === "SAKEN_SKAL_VURDERES_FOR_ANMELDELSE";
      }
      if (
        tilSteg !== "AVSLUTTET" ||
        resultat?.forvaltning?.type !== "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE"
      ) {
        return false;
      }
      const utfall = hentForvaltningensEndeligeUtfall(resultat);
      return (
        utfall?.type === "FEILUTBETALINGSSAK_ORDINAER" ||
        utfall?.type === "KONTROLLNOTAT" ||
        utfall?.type === "HENLAGT"
      );
    case "STRAFFERETTSLIG_VURDERING":
      if (tilSteg === "POLITI") {
        return (
          resultat?.strafferettsligVurdering?.type === "ANMELDT" &&
          resultat.strafferettsligVurdering.anmeldtBelop != null
        );
      }
      if (tilSteg !== "AVSLUTTET") return false;
      return (
        resultat?.strafferettsligVurdering?.type === "KONTROLLNOTAT" ||
        resultat?.strafferettsligVurdering?.type === "FEILUTBETALINGSSAK_ORDINAER" ||
        (resultat?.strafferettsligVurdering?.type === "HENLAGT" &&
          resultat.strafferettsligVurdering.henleggelsesarsak != null)
      );
    case "POLITI":
      return (
        tillatteHandlinger.tilstand.status !== "PAAKLAGET" &&
        erPolitiresultatKomplett(resultat?.politi)
      );
    default:
      return false;
  }
}

export function hentVisbareSteg(
  tillatteHandlinger: TillatteHandlingerResponse,
): TillatteHandlingerResponse["tillatteSteg"] {
  const henlagt = erHenlagtIGjeldendeSteg(tillatteHandlinger.tilstand);
  const kandidater = tillatteHandlinger.muligeNesteSteg ?? tillatteHandlinger.tillatteSteg;
  return kandidater.filter((steg) => !henlagt || steg === "AVSLUTTET");
}
