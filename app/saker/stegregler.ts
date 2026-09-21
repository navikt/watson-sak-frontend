import type { KontrollsakSteg } from "~/saker/types.backend";

export type StegbaserteSaksregler = {
  erAktiv: boolean;
  kanUtføreUtredningsarbeid: boolean;
  kanLasteOppFiler: boolean;
  kanRedigereDokumenter: boolean;
  kanLeggeTilHistorikk: boolean;
  kanEndreDeltTilgang: boolean;
};

export function hentStegbaserteSaksregler(steg: KontrollsakSteg): StegbaserteSaksregler {
  const erAktiv = steg !== "AVSLUTTET";
  const kanUtføreUtredningsarbeid = erAktiv && steg !== "OPPRETTET";

  return {
    erAktiv,
    kanUtføreUtredningsarbeid,
    kanLasteOppFiler: erAktiv,
    kanRedigereDokumenter: kanUtføreUtredningsarbeid,
    kanLeggeTilHistorikk: kanUtføreUtredningsarbeid,
    kanEndreDeltTilgang: kanUtføreUtredningsarbeid,
  };
}
