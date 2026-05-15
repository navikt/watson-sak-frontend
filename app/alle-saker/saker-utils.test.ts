import { describe, expect, it } from "vitest";
import type { KontrollsakResponse } from "~/saker/types.backend";
import {
  beregnTraktSteg,
  filtrerSaker,
  normaliserFilterVerdier,
  sorterSaker,
  unikeVerdier,
} from "./saker-utils";

function lagSak(overrides: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: 1,
    personIdent: "10987654321",
    personNavn: "Ola Nordmann",
    saksbehandlere: {
      eier: { navIdent: "Z123456", navn: "Saks Behandler", enhet: "4812" },
      deltMed: [],
      opprettetAv: { navIdent: "Z654321", navn: "Oppretter", enhet: "4812" },
    },
    status: "OPPRETTET",
    kategori: "SAMLIV",
    kilde: "PUBLIKUM",
    misbruktype: ["SKJULT_SAMLIV"],
    prioritet: "NORMAL",
    blokkert: null,
    ytelser: [],
    merking: null,
    opprettet: "2026-02-03T10:00:00Z",
    oppdatert: null,
    oppgaver: [],
    ...overrides,
  };
}

describe("normaliserFilterVerdier", () => {
  it("filtrerer tomme strenger", () => {
    expect(normaliserFilterVerdier(["a", "", "  ", "b"])).toEqual(["a", "b"]);
  });

  it("fjerner duplikater", () => {
    expect(normaliserFilterVerdier(["a", "a", "b"])).toEqual(["a", "b"]);
  });

  it("returnerer tom liste ved ingen gyldige verdier", () => {
    expect(normaliserFilterVerdier(["", "  "])).toEqual([]);
  });
});

describe("unikeVerdier", () => {
  it("returnerer sorterte unike verdier", () => {
    expect(unikeVerdier(["Øst", "Arbeid", "Arbeid", "Sør"])).toEqual(["Arbeid", "Sør", "Øst"]);
  });

  it("filtrerer bort tomme strenger", () => {
    expect(unikeVerdier(["a", "", "b"])).toEqual(["a", "b"]);
  });
});

describe("beregnTraktSteg", () => {
  it("returnerer steg i prosesskjede-rekkefølge", () => {
    const saker = [
      lagSak({ status: "UTREDES" }),
      lagSak({ status: "OPPRETTET" }),
      lagSak({ status: "OPPRETTET" }),
    ];

    const steg = beregnTraktSteg(saker);

    expect(steg.map((s) => s.antall)).toEqual([2, 1]);
    expect(steg[0].label).toBe("Opprettet");
    expect(steg[1].label).toBe("Utredes");
  });

  it("utelater statuser med 0 saker", () => {
    const saker = [lagSak({ status: "AVSLUTTET" })];

    const steg = beregnTraktSteg(saker);

    expect(steg).toHaveLength(1);
    expect(steg[0].label).toBe("Avsluttet");
  });

  it("returnerer tom liste for tom saksliste", () => {
    expect(beregnTraktSteg([])).toEqual([]);
  });
});

describe("filtrerSaker", () => {
  const saker = [
    lagSak({
      id: 100,
      kategori: "SAMLIV",
      misbruktype: ["SKJULT_SAMLIV"],
      merking: null,
      saksbehandlere: {
        eier: { navIdent: "Z1", navn: "Anne", enhet: "4812" },
        deltMed: [],
        opprettetAv: { navIdent: "Z0", navn: "Oppretter", enhet: "4812" },
      },
    }),
    lagSak({
      id: 200,
      kategori: "ARBEID",
      misbruktype: ["FIKTIVT_ARBEIDSFORHOLD"],
      merking: "HASTEBEHANDLING",
      saksbehandlere: {
        eier: { navIdent: "Z2", navn: "Bjørn", enhet: "4801" },
        deltMed: [],
        opprettetAv: { navIdent: "Z0", navn: "Oppretter", enhet: "4801" },
      },
    }),
  ];

  it("returnerer alle saker når ingen filtre er satt", () => {
    expect(
      filtrerSaker(saker, {
        enhet: [],
        saksbehandler: [],
        kategori: [],
        misbrukstype: [],
        merking: [],
      }),
    ).toHaveLength(2);
  });

  it("filtrerer på kategori", () => {
    const resultat = filtrerSaker(saker, {
      enhet: [],
      saksbehandler: [],
      kategori: ["Samliv"],
      misbrukstype: [],
      merking: [],
    });
    expect(resultat).toHaveLength(1);
    expect(resultat[0].id).toBe(100);
  });

  it("filtrerer på saksbehandler", () => {
    const resultat = filtrerSaker(saker, {
      enhet: [],
      saksbehandler: ["Bjørn"],
      kategori: [],
      misbrukstype: [],
      merking: [],
    });
    expect(resultat).toHaveLength(1);
    expect(resultat[0].id).toBe(200);
  });

  it("kombinerte filtre gir AND-logikk", () => {
    const resultat = filtrerSaker(saker, {
      enhet: [],
      saksbehandler: ["Anne"],
      kategori: ["Arbeid"],
      misbrukstype: [],
      merking: [],
    });
    expect(resultat).toHaveLength(0);
  });
});

describe("sorterSaker", () => {
  it("sorterer saksid numerisk (ikke leksikografisk)", () => {
    const saker = [
      lagSak({ id: 10 }),
      lagSak({ id: 2 }),
      lagSak({ id: 100 }),
    ];

    const sortert = sorterSaker(saker, "saksid", "asc");

    expect(sortert.map((s) => s.id)).toEqual([2, 10, 100]);
  });

  it("sorterer synkende på opprettet-dato", () => {
    const saker = [
      lagSak({ id: 1, opprettet: "2026-01-01T00:00:00Z" }),
      lagSak({ id: 2, opprettet: "2026-03-01T00:00:00Z" }),
      lagSak({ id: 3, opprettet: "2026-02-01T00:00:00Z" }),
    ];

    const sortert = sorterSaker(saker, "opprettet", "desc");

    expect(sortert.map((s) => s.id)).toEqual([2, 3, 1]);
  });

  it("sorterer saksbehandler alfabetisk", () => {
    const lagMedSaksbehandler = (navn: string, id: number) =>
      lagSak({
        id,
        saksbehandlere: {
          eier: { navIdent: "Z1", navn, enhet: "4812" },
          deltMed: [],
          opprettetAv: { navIdent: "Z0", navn: "Oppretter", enhet: "4812" },
        },
      });

    const saker = [
      lagMedSaksbehandler("Øyvind", 1001),
      lagMedSaksbehandler("Anna", 1002),
      lagMedSaksbehandler("Bjørn", 1003),
    ];

    const sortert = sorterSaker(saker, "saksbehandler", "asc");

    expect(sortert.map((s) => s.saksbehandlere.eier?.navn)).toEqual(["Anna", "Bjørn", "Øyvind"]);
  });
});
