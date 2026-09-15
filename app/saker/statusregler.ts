import type { KontrollsakStatus } from "~/saker/types.backend";

export type StatusbaserteSaksregler = {
  erAktiv: boolean;
  kanUtføreUtredningsarbeid: boolean;
  kanLasteOppFiler: boolean;
  kanRedigereDokumenter: boolean;
  kanLeggeTilHistorikk: boolean;
  kanEndreDeltTilgang: boolean;
};

export function hentStatusbaserteSaksregler(status: KontrollsakStatus): StatusbaserteSaksregler {
  const erAktiv = status !== "AVSLUTTET";
  const kanUtføreUtredningsarbeid = erAktiv && status !== "OPPRETTET";

  return {
    erAktiv,
    kanUtføreUtredningsarbeid,
    kanLasteOppFiler: erAktiv,
    kanRedigereDokumenter: kanUtføreUtredningsarbeid,
    kanLeggeTilHistorikk: kanUtføreUtredningsarbeid,
    kanEndreDeltTilgang: kanUtføreUtredningsarbeid,
  };
}
