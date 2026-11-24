import { data } from "react-router";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { hentAlleSaker } from "~/saker/mock-alle-saker.server";
import { hentMockState } from "~/testing/mock-store/session.server";
import type { MigreringKilde } from "./migrering-kilde.server";
import {
  hentMockAnsattKandidater,
  hentMockMigreringKandidater,
  MOCK_MIGRERING_ANSATTE,
  MOCK_MIGRERING_MOTTAKERE,
} from "./mock-data.server";
import {
  hentMigreringsstatus,
  INGEN_MOTTAKERE,
  MIGRERING_SIDESTORRELSE,
  type MigreringAnsatt,
  type MigreringFilter,
  type MigreringKandidat,
  type MigreringMottakere,
  type MigreringSide,
} from "./types";

/**
 * Kobler kandidatene mot faktisk opprettede mock-saker: en kandidat er
 * «overført til Watson» når det finnes en sak i mock-lageret med samme
 * (legacyKilde, legacyPid) — uansett om det skjedde i denne økten (via
 * migreringslisten sitt «Opprett sak») eller var forhåndsdefinert i
 * mock-dataene.
 */
function merkAlleredeOverforte(
  request: Request,
  kandidater: MigreringKandidat[],
): MigreringKandidat[] {
  const saker = hentAlleSaker(request);

  return kandidater.map((k) => {
    const treff = saker.find(
      (sak) => sak.legacyKilde === k.legacyKilde && sak.legacyPid === k.legacyPid,
    );
    if (!treff) {
      return k;
    }
    return { ...k, alleredeMigrertTilKontrollsakId: treff.id };
  });
}

/** Deler en liste i sider (for mock-data, der backend ikke paginerer). */
function sideAv(kandidater: MigreringKandidat[], side: number): MigreringSide {
  const totalSider = Math.ceil(kandidater.length / MIGRERING_SIDESTORRELSE);
  const aktiv = Math.min(side, Math.max(1, totalSider));
  const fra = (aktiv - 1) * MIGRERING_SIDESTORRELSE;
  return {
    kandidater: kandidater.slice(fra, fra + MIGRERING_SIDESTORRELSE),
    side: aktiv,
    totalSider,
    totalAntall: kandidater.length,
  };
}

function medFilter(kandidater: MigreringKandidat[], filter: MigreringFilter): MigreringKandidat[] {
  return kandidater.filter(
    (k) =>
      (filter.status.length === 0 || filter.status.includes(hentMigreringsstatus(k))) &&
      (!filter.enhet || k.enhet === filter.enhet) &&
      (!filter.ansvarlig || k.ansvar.navIdent === filter.ansvarlig),
  );
}

/** Som backend: lederens egne først, resten i opprinnelig rekkefølge. */
function egneFørst(navIdent: string, kandidater: MigreringKandidat[]) {
  return [
    ...kandidater.filter((k) => k.ansvar.navIdent === navIdent),
    ...kandidater.filter((k) => k.ansvar.navIdent !== navIdent),
  ];
}

/** Backend tar med lederen selv blant mottakerne, og lederens enhet blant enhetene. */
function mottakerValgMedLeder(bruker: {
  navIdent: string;
  name: string;
  enhet: string;
  enhetId?: string | null;
}): MigreringMottakere {
  const enhetId = bruker.enhetId ?? bruker.enhet;
  const harEnhet = MOCK_MIGRERING_MOTTAKERE.enheter.some((e) => e.id === enhetId);
  return {
    enheter: harEnhet
      ? MOCK_MIGRERING_MOTTAKERE.enheter
      : [...MOCK_MIGRERING_MOTTAKERE.enheter, { id: enhetId, navn: bruker.enhet }],
    mottakere: [
      ...MOCK_MIGRERING_MOTTAKERE.mottakere.filter((m) => m.navIdent !== bruker.navIdent),
      { navIdent: bruker.navIdent, navn: bruker.name, enhetId, enhetNavn: bruker.enhet },
    ],
  };
}

/** Gjenskaper backend-reglene med syntetiske data. Tildelinger lagres i mock-sesjonen. */
export function mockMigreringKilde(request: Request): MigreringKilde {
  return {
    async hentLister({ side, filter }) {
      const bruker = await hentInnloggetBruker({ request });
      const kandidater = merkAlleredeOverforte(
        request,
        hentMockMigreringKandidater(bruker.navIdent),
      );
      const tildelinger = hentMockState(request).migreringTildelinger;
      const ansatteValg: MigreringAnsatt[] = bruker.erLeder
        ? [
            ...MOCK_MIGRERING_ANSATTE,
            {
              navIdent: bruker.navIdent,
              navn: bruker.name,
              enhetId: bruker.enhetId ?? bruker.enhet,
              enhetNavn: bruker.enhet,
            },
          ]
        : [];
      const egne = kandidater
        .filter((k) => k.ansvar.type === "BEKREFTET" && k.ansvar.navIdent === bruker.navIdent)
        .map((k): MigreringKandidat => {
          const navIdent = tildelinger.get(k.kandidatId) ?? k.ansvar.navIdent;
          const ansvarlig = ansatteValg.find((a) => a.navIdent === navIdent);
          return {
            ...k,
            ansvar: { type: "BEKREFTET", navIdent: navIdent ?? "" },
            // Personnummer vises bare for lederens egne rader, slik backend gjør.
            ...(navIdent === bruker.navIdent ? {} : { personIdent: undefined }),
            ansvarligNavn: ansvarlig?.navn ?? bruker.name,
            enhet: ansvarlig?.enhetId ?? null,
          };
        });
      // Syntetiske ansatte vises bare for ledere, slik at saksbehandlere ikke ser andres saker.
      // Flyttes en sak til noen utenfor lederens ansatte (for eksempel i en annen enhet), forsvinner den fra listen.
      const alle = bruker.erLeder
        ? egneFørst(
            bruker.navIdent,
            [...egne, ...hentMockAnsattKandidater(tildelinger, ansatteValg)].filter((k) =>
              ansatteValg.some((a) => a.navIdent === k.ansvar.navIdent),
            ),
          )
        : egne;
      const liste = medFilter(
        alle,
        bruker.erLeder ? filter : { ...filter, enhet: null, ansvarlig: null },
      );

      return {
        liste: sideAv(liste, side),
        ansatteValg,
        mottakerValg: bruker.erLeder ? mottakerValgMedLeder(bruker) : INGEN_MOTTAKERE,
        filter,
        erLeder: bruker.erLeder,
        egenNavIdent: bruker.navIdent,
        utilgjengelig: false,
      };
    },

    async tildel({ bruker, kandidatId, navIdent }) {
      if (
        navIdent !== bruker.navIdent &&
        !MOCK_MIGRERING_MOTTAKERE.mottakere.some((a) => a.navIdent === navIdent)
      ) {
        throw data("Ugyldig tildeling", { status: 400 });
      }
      const tildelinger = hentMockState(request).migreringTildelinger;
      const tildelbar = [
        ...hentMockAnsattKandidater(tildelinger),
        ...hentMockMigreringKandidater(bruker.navIdent).filter(
          (k) => k.ansvar.type === "BEKREFTET" && k.ansvar.navIdent === bruker.navIdent,
        ),
      ].find((k) => k.kandidatId === kandidatId);
      if (!tildelbar) {
        throw data("Kandidaten finnes ikke", { status: 404 });
      }
      if (hentMigreringsstatus(tildelbar) !== "IKKE_PABEGYNT") {
        throw data("Saken er allerede påbegynt og kan ikke flyttes til en annen", { status: 409 });
      }
      tildelinger.set(kandidatId, navIdent);
      return { ok: true };
    },
  };
}
