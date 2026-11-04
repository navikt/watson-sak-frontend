import { afterEach, describe, expect, it, vi } from "vitest";
import { getSaksenhet } from "~/saker/selectors";
import { lagMockOyeblikksbilde } from "~/saker/mock-oppsummering.server";
import { lagInitialKontrollsaker } from "~/testing/mock-store/saker/fordeling.server";
import { lagInitialMineKontrollsaker } from "~/testing/mock-store/saker/mine-saker.server";
import { lagMockStatistikk } from "./mock.server";

const INGEN_SAKER = { saker: [], navIdent: "Z123456" };

describe("lagMockStatistikk", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(["2026-10-27T12:00:00Z", "2031-03-31T12:00:00Z"])(
    "teller aldersvarsler fra mock-sakene, også %s",
    (nå) => {
      vi.useFakeTimers({ now: new Date(nå) });
      const saker = [...lagInitialKontrollsaker(), ...lagInitialMineKontrollsaker()];

      const resultat = lagMockStatistikk(
        { nivaa: "underavdeling", fra: "2026-09-01", til: "2026-09-30" },
        "Analyse",
        "by295h",
        { saker, navIdent: "L999999" },
      );

      expect(resultat.varsler.map((varsel) => [varsel.filter, varsel.tekst])).toEqual([
        ["nærmer-seg-frist", "1 sak nærmer seg 12 måneders total behandlingstid"],
        ["over-30-dager", "1 sak overskrider 30 dager fra opprettet"],
      ]);
    },
  );

  it("viser ingen aldersvarsler når ingen saker treffer", () => {
    const resultat = lagMockStatistikk(
      { nivaa: "underavdeling", fra: "2026-09-01", til: "2026-09-30" },
      "Øst",
      "ky153k",
      INGEN_SAKER,
    );

    expect(resultat.varsler).toEqual([]);
  });

  it("beregner nøkkeltall fra sakene for valgt enhet", () => {
    const saker = [...lagInitialKontrollsaker(), ...lagInitialMineKontrollsaker()];
    const enhetId = "ky153k";
    const enhetensSaker = saker.filter(
      (sak) => getSaksenhet(sak) === enhetId || sak.saksbehandlere.eier?.enhet === enhetId,
    );
    const øyeblikksbilde = lagMockOyeblikksbilde(enhetensSaker);

    const resultat = lagMockStatistikk(
      { nivaa: "underavdeling", enhetId, fra: "2026-09-01", til: "2026-09-30" },
      "Øst",
      "hu424t",
      { saker, navIdent: "Z123456" },
    );
    const nøkkeltall = Object.fromEntries(
      resultat.nøkkeltall.map(({ label, verdi }) => [label, Number(verdi)]),
    );

    expect(nøkkeltall).toMatchObject({
      Totalt: øyeblikksbilde.totalt,
      Aktive: øyeblikksbilde.aktive,
      "Venter på andre": øyeblikksbilde.venterPåAndre,
      "Ikke fordelt": øyeblikksbilde.ikkeFordelt,
    });
    expect(nøkkeltall.Totalt).toBe(
      øyeblikksbilde.nye + nøkkeltall.Aktive + nøkkeltall["Venter på andre"],
    );
  });

  it("teller «Meg selv» fra samme utvalg som forsiden", () => {
    const mineSaker = lagInitialMineKontrollsaker();

    const resultat = lagMockStatistikk(
      { nivaa: "meg", fra: "2026-09-01", til: "2026-09-30" },
      "Øst",
      "ky153k",
      { saker: lagInitialKontrollsaker(), navIdent: "Z123456", mineSaker },
    );

    expect(resultat.nøkkeltall.find(({ label }) => label === "Totalt")?.verdi).toBe(
      String(lagMockOyeblikksbilde(mineSaker).totalt),
    );
  });

  it("lager alle datasett som statistikksiden trenger", () => {
    const resultat = lagMockStatistikk(
      { nivaa: "underavdeling", fra: "2026-09-01", til: "2026-09-30" },
      "Øst",
      "ky153k",
      INGEN_SAKER,
    );

    expect(resultat.valgtOmfang).toBe("enhet:ky153k");
    expect(resultat.omfangEnheter).toEqual(["ky153k"]);
    expect(resultat.organisasjonsvalg.map((valg) => valg.label)).toEqual([
      "Meg selv",
      "Min avdeling (Øst)",
      "Øst 1",
      "Øst 2",
      "Hele organisasjonen",
    ]);
    expect(resultat.organisasjonsvalg.filter((valg) => valg.type === "meg")).toHaveLength(1);
    expect(resultat.periode).toEqual({
      fra: "2026-09-01",
      til: "2026-09-30",
      label: "Egendefinert periode",
    });
    expect(resultat.nøkkeltall).toHaveLength(6);
    expect(resultat.sakstyper).toHaveLength(8);
    expect(resultat.kategorifordeling.length).toBeGreaterThan(1);
    expect(resultat.henlagt.reduce((sum, rad) => sum + rad.verdi, 0)).toBe(168);
    expect(resultat.statusfordeling[0]).toEqual({
      navn: "Opprettet",
      filterverdi: "OPPRETTET",
      verdi: resultat.periodeTall.innkomne,
      prosent: 100,
    });
  });

  it("returnerer «meg»-omfanget uten enheter og uten NAV-ident", () => {
    const resultat = lagMockStatistikk(
      { nivaa: "meg", fra: "2026-09-01", til: "2026-09-30" },
      "Øst",
      "ky153k",
      INGEN_SAKER,
    );

    expect(resultat.omfangEnheter).toEqual([]);
    expect(resultat).not.toHaveProperty("omfangAnsvarligNavIdent");
  });
});
