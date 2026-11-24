import { data } from "react-router";
import type { InnloggetBruker } from "~/auth/innlogget-bruker.server";
import { hentFordelingssaker } from "~/saker/mock-alle-saker.server";
import { lagMockStatistikk } from "~/statistikk/mock.server";
import { filtrerSaker, sorterSaker, type AlleSakerKolonne } from "~/alle-saker/saker-utils";
import { ANTALL_PER_SIDE } from "~/utils/paginering";
import { erKlarForFordeling, mapKontrollsakTilFordelingSak } from "./mapper";
import {
  lagUfordelteOppsummering,
  ufordelteSorteringskolonner,
  type UfordeltSorteringskolonne,
} from "./ufordelte-saker";
import { ALLE_STEG } from "~/saker/steg";
import type { KontrollsakSteg } from "~/saker/types.backend";
import type { UfordelteSakerResponse } from "./types.backend";

/** Speiler det paginerte backendoppslaget i lokal mock og demo. */
export function hentMockFordelingsside(
  request: Request,
  bruker: InnloggetBruker,
): UfordelteSakerResponse {
  if (!bruker.enhetId) throw data("Fant ikke enhet for innlogget bruker.", { status: 403 });
  const params = new URL(request.url).searchParams;
  const sideverdi = params.get("side") ?? "1";
  const side = Number(sideverdi);
  if (!/^\d+$/.test(sideverdi) || !Number.isSafeInteger(side) || side < 1) {
    throw data("Ugyldig sidenummer", { status: 400 });
  }
  const alle = hentFordelingssaker(request).filter(erKlarForFordeling);
  const år = new Date().getFullYear();
  const statistikk = lagMockStatistikk(
    { nivaa: "underavdeling", fra: `${år}-01-01`, til: `${år}-12-31` },
    bruker.enhet,
    bruker.enhetId,
    { saker: alle, navIdent: bruker.navIdent },
  );
  const egenVerdi = `enhet:${bruker.enhetId}`;
  const organisasjonsvalg = statistikk.organisasjonsvalg
    .filter((valg) => valg.verdi !== "meg" && (bruker.erLeder || valg.verdi === egenVerdi))
    .map((valg) => (valg.verdi === egenVerdi ? { ...valg, label: bruker.enhet } : valg));
  const valgtOmfang = params.get("omfang") ?? egenVerdi;
  const valgt = organisasjonsvalg.find((valg) => valg.verdi === valgtOmfang);
  if (!valgt) throw data("Du har ikke tilgang til valgt omfang.", { status: 403 });
  const enhetId = valgtOmfang.slice("enhet:".length);
  const enheter = valgtOmfang === "organisasjon" ? [] : [enhetId];
  const steg = params.getAll("steg");
  if (steg.some((s) => !ALLE_STEG.includes(s as KontrollsakSteg))) {
    throw data("Ugyldig steg for fordeling", { status: 400 });
  }
  const filtrerte = filtrerSaker(alle, {
    enhet: enheter,
    saksbehandler: [],
    kategori: params.getAll("kategori"),
    misbrukstype: params.getAll("misbrukstype"),
    merking: params.getAll("merking"),
    steg: steg as KontrollsakSteg[],
  });
  const kolonne = params.get("sorter") ?? "opprettet";
  const retning = params.get("retning") ?? "synkende";
  if (
    !ufordelteSorteringskolonner.includes(kolonne as UfordeltSorteringskolonne) ||
    !["stigende", "synkende"].includes(retning)
  ) {
    throw data("Ugyldig sortering", { status: 400 });
  }
  // Tie-break før stabil sortering gir samme rekkefølge ved like verdier.
  const sorterte = sorterSaker(
    [...filtrerte].sort((a, b) => (a.id - b.id) * (retning === "stigende" ? 1 : -1)),
    kolonne as AlleSakerKolonne,
    retning === "stigende" ? "asc" : "desc",
  );
  return {
    items: sorterte.slice((side - 1) * ANTALL_PER_SIDE, side * ANTALL_PER_SIDE),
    page: side,
    size: ANTALL_PER_SIDE,
    totalItems: sorterte.length,
    totalPages: Math.ceil(sorterte.length / ANTALL_PER_SIDE),
    oppsummering: lagUfordelteOppsummering(filtrerte.map(mapKontrollsakTilFordelingSak)),
    valgtOmfang,
    enhetNavn: valgtOmfang === "organisasjon" ? "hele organisasjonen" : valgt.label,
    organisasjonsvalg,
  };
}
