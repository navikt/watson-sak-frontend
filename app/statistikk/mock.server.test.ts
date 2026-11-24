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

  it("avleder eldste sak, sakstyper og aldersbøtter fra de åpne sakene", () => {
    vi.useFakeTimers({ now: new Date("2026-03-10T22:30:00Z") });
    const [utgangspunkt] = lagInitialKontrollsaker();
    const åpenSak = {
      ...utgangspunkt,
      id: 739,
      kategori: "SAMLIV",
      steg: "OPPRETTET" as const,
      opprettet: "2025-01-10T23:30:00Z",
    };
    const avsluttetSak = {
      ...utgangspunkt,
      id: 740,
      steg: "AVSLUTTET" as const,
      opprettet: "2020-01-01T00:00:00Z",
    };

    const resultat = lagMockStatistikk(
      { nivaa: "nav-kontroll", fra: "2026-09-01", til: "2026-09-30" },
      "Øst",
      "ky153k",
      { saker: [åpenSak, avsluttetSak], navIdent: "Z123456" },
    );
    const eldste = resultat.nøkkeltall.find(({ label }) => label === "Eldste åpne sak");
    const totalt = Number(resultat.nøkkeltall.find(({ label }) => label === "Totalt")?.verdi);

    expect(eldste).toMatchObject({ verdi: "13 mnd", forklaring: "Sak 739" });
    expect(
      resultat.sakstyper.flatMap(({ deler }) => deler).reduce((sum, del) => sum + del.verdi, 0),
    ).toBe(totalt);
    expect(resultat.alderssammensetning.reduce((sum, bøtte) => sum + bøtte.verdi, 0)).toBe(totalt);
    expect(resultat.alderssammensetning.find(({ navn }) => navn === "12–24")?.verdi).toBe(1);
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
    expect(resultat.organisasjonsvalg[1].verdi).toBe("hovedavdeling:ky153k");
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

  it("bruker valgt enhet som hovedavdeling og holder periodetallene konsistente", () => {
    const resultat = lagMockStatistikk(
      { nivaa: "hovedavdeling", enhetId: "ky153k", fra: "2026-09-01", til: "2026-09-30" },
      "Øst",
      "hu424t",
      INGEN_SAKER,
    );
    const status = Object.fromEntries(
      resultat.statusfordeling.map(({ navn, verdi }) => [navn, verdi]),
    );
    const sumHenlagt = resultat.henlagt.reduce((sum, rad) => sum + rad.verdi, 0);
    const saksbehandlingstid = resultat.nøkkeltall.find(
      ({ label }) => label === "Saksbehandlingstid",
    );

    expect(resultat.valgtOmfang).toBe("hovedavdeling:ky153k");
    expect(resultat.omfangEnheter).toEqual(["ky153k"]);
    expect(status.Opprettet).toBe(resultat.periodeTall.innkomne);
    expect(status.Henlagt).toBe(sumHenlagt);
    expect(sumHenlagt).toBeLessThanOrEqual(resultat.periodeTall.avsluttede);
    expect(Math.round(resultat.kontrollrapport.reduce((sum, rad) => sum + rad.prosent, 0))).toBe(
      100,
    );
    expect(saksbehandlingstid).toMatchObject({
      verdi: "32 dager",
      forklaring: "Fra utredning til avsluttet, siste 12 mnd (snitt)",
    });
  });

  it("viser tom eldste-sak-verdi når utvalget ikke har åpne saker", () => {
    const resultat = lagMockStatistikk(
      { nivaa: "underavdeling", fra: "2026-09-01", til: "2026-09-30" },
      "Øst",
      "ky153k",
      INGEN_SAKER,
    );

    expect(resultat.nøkkeltall.find(({ label }) => label === "Eldste åpne sak")).toMatchObject({
      verdi: "–",
      forklaring: "Ingen åpne saker",
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
