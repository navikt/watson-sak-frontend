import { describe, expect, it } from "vitest";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { filtrerSaker, normaliserFilterVerdier, sorterSaker, unikeVerdier } from "./saker-utils";
import { ALLE_STEG } from "~/saker/steg";

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
    steg: "OPPRETTET",
    kategori: "SAMLIV",
    kilde: "PUBLIKUM",
    misbruktype: ["SKJULT_SAMLIV"],
    prioritet: "NORMAL",
    status: null,
    ytelser: [],
    merking: [],
    arbeidsgivere: [],
    opprettet: "2026-02-03T10:00:00Z",
    oppdatert: null,
    oppgaver: [],
    kobledeSaker: [],
    dokumenter: [],
    adresseskjermet: false,
    gjeldendePersonIdent: null,
    historiskeIdenter: [],
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

describe("filtrerSaker", () => {
  const saker = [
    lagSak({
      id: 100,
      kategori: "SAMLIV",
      misbruktype: ["SKJULT_SAMLIV"],
      merking: [],
      arbeidsgivere: [],
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
      merking: ["HASTEBEHANDLING"],
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
        steg: [],
      }),
    ).toHaveLength(2);
  });

  it("filtrerer på kategori", () => {
    const resultat = filtrerSaker(saker, {
      enhet: [],
      saksbehandler: [],
      kategori: ["SAMLIV"],
      misbrukstype: [],
      merking: [],
      steg: [],
    });
    expect(resultat).toHaveLength(1);
    expect(resultat[0].id).toBe(100);
  });

  it("filtrerer på saksbehandler (navIdent)", () => {
    const resultat = filtrerSaker(saker, {
      enhet: [],
      saksbehandler: ["Z2"],
      kategori: [],
      misbrukstype: [],
      merking: [],
      steg: [],
    });
    expect(resultat).toHaveLength(1);
    expect(resultat[0].id).toBe(200);
  });

  it("filtrerer på sakens eller ansvarliges enhet", () => {
    const sakerMedEnhet = [
      lagSak({ id: 300, enhet: "va903j" }),
      lagSak({
        id: 301,
        saksbehandlere: {
          eier: { navIdent: "Z3", navn: "Cecilie", enhet: "Øst", enhetId: "va903j" },
          deltMed: [],
          opprettetAv: { navIdent: "Z0", navn: "Oppretter", enhet: "Øst" },
        },
      }),
      lagSak({ id: 302, enhet: "je679z" }),
    ];

    const resultat = filtrerSaker(sakerMedEnhet, {
      enhet: ["va903j"],
      saksbehandler: [],
      kategori: [],
      misbrukstype: [],
      merking: [],
      steg: [],
    });

    expect(resultat.map((sak) => sak.id)).toEqual([300, 301]);
  });

  it("kombinerte filtre gir AND-logikk", () => {
    const resultat = filtrerSaker(saker, {
      enhet: [],
      saksbehandler: ["Z1"],
      kategori: ["ARBEID"],
      misbrukstype: [],
      merking: [],
      steg: [],
    });
    expect(resultat).toHaveLength(0);
  });

  it("filtrerer på misbrukstype alene", () => {
    const resultat = filtrerSaker(saker, {
      enhet: [],
      saksbehandler: [],
      kategori: [],
      misbrukstype: ["SKJULT_SAMLIV"],
      merking: [],
      steg: [],
    });
    expect(resultat).toHaveLength(1);
    expect(resultat[0].id).toBe(100);
  });

  it("kombinerer kategori og misbrukstype med AND-logikk", () => {
    const resultat = filtrerSaker(saker, {
      enhet: [],
      saksbehandler: [],
      kategori: ["ARBEID"],
      misbrukstype: ["FIKTIVT_ARBEIDSFORHOLD"],
      merking: [],
      steg: [],
    });
    expect(resultat).toHaveLength(1);
    expect(resultat[0].id).toBe(200);
  });

  it("returnerer ingen saker når kategori og misbrukstype ikke matcher samme sak", () => {
    // SKJULT_SAMLIV tilhører SAMLIV, ikke ARBEID
    const resultat = filtrerSaker(saker, {
      enhet: [],
      saksbehandler: [],
      kategori: ["ARBEID"],
      misbrukstype: ["SKJULT_SAMLIV"],
      merking: [],
      steg: [],
    });
    expect(resultat).toHaveLength(0);
  });

  it("filtrerer på steg", () => {
    const sakerMedUliktSteg = [
      ...saker,
      lagSak({ id: 300, steg: "UTREDES" }),
      lagSak({ id: 301, steg: "UTREDNING" }),
    ];

    const resultat = filtrerSaker(sakerMedUliktSteg, {
      enhet: [],
      saksbehandler: [],
      kategori: [],
      misbrukstype: [],
      merking: [],
      steg: ["UTREDNING"],
    });

    expect(resultat.map((sak) => sak.id)).toEqual([300, 301]);
  });

  it("filtrerer åpne, aktive og ventende saker som statistikken", () => {
    const sakerMedArbeidsfilter = [
      lagSak({ id: 400, steg: "OPPRETTET" }),
      lagSak({ id: 401, steg: "UTREDNING", status: "AKTIV" }),
      lagSak({ id: 402, steg: "UTREDNING", status: "VENTER_PA_INFORMASJON" }),
      lagSak({ id: 403, steg: "POLITI" }),
      lagSak({ id: 404, steg: "FORVALTNING", status: "I_BERO" }),
      lagSak({
        id: 405,
        steg: "FORVALTNING",
        saksbehandlere: {
          eier: null,
          deltMed: [],
          opprettetAv: { navIdent: "Z0", navn: "Oppretter", enhet: "4812" },
        },
      }),
      lagSak({ id: 407, steg: "STRAFFERETTSLIG_VURDERING" }),
      lagSak({ id: 408, steg: "STRAFFERETTSLIG_VURDERING", status: "AKTIV" }),
      lagSak({ id: 406, steg: "AVSLUTTET" }),
    ];
    const grunnfilter = {
      enhet: [],
      saksbehandler: [],
      kategori: [],
      misbrukstype: [],
      merking: [],
      steg: [],
    };

    expect(
      filtrerSaker(sakerMedArbeidsfilter, { ...grunnfilter, steg: ALLE_STEG }).map((sak) => sak.id),
    ).toEqual([400, 401, 402, 403, 404, 405, 407, 408]);
    expect(
      filtrerSaker(sakerMedArbeidsfilter, {
        ...grunnfilter,
        steg: ["UTREDNING", "STRAFFERETTSLIG_VURDERING"],
        status: ["AKTIV"],
      }).map((sak) => sak.id),
    ).toEqual([401, 408]);
    expect(
      filtrerSaker(sakerMedArbeidsfilter, {
        ...grunnfilter,
        steg: ALLE_STEG,
        status: ["VENTER_PA_INFORMASJON", "I_BERO", "HOS_FORVALTNING", "HOS_POLITI"],
      }).map((sak) => sak.id),
    ).toEqual([402, 403, 404, 405]);
  });

  it("venter på andre kombinerer to steg og to statuser med ELLER uten krav om ansvarlig", () => {
    const utenAnsvarlig = {
      eier: null,
      deltMed: [],
      opprettetAv: { navIdent: "Z0", navn: "Oppretter", enhet: "4812" },
    };
    const ventendeSaker = [
      lagSak({
        id: 1,
        steg: "UTREDNING",
        status: "VENTER_PA_INFORMASJON",
        saksbehandlere: utenAnsvarlig,
      }),
      lagSak({
        id: 2,
        steg: "STRAFFERETTSLIG_VURDERING",
        status: "I_BERO",
        saksbehandlere: utenAnsvarlig,
      }),
      lagSak({ id: 3, steg: "FORVALTNING", status: "AKTIV", saksbehandlere: utenAnsvarlig }),
      lagSak({ id: 4, steg: "POLITI", saksbehandlere: utenAnsvarlig }),
      lagSak({ id: 5, steg: "FORVALTNING", status: "I_BERO" }),
      lagSak({ id: 6, steg: "UTREDNING", status: "VENTER_PA_VEDTAK" }),
      lagSak({ id: 7, steg: "STRAFFERETTSLIG_VURDERING", status: "VENTER_PA_RESULTAT" }),
      lagSak({ id: 8, steg: "STRAFFERETTSLIG_VURDERING", status: "PAAKLAGET" }),
      lagSak({ id: 9, steg: "AVSLUTTET", status: "I_BERO" }),
      lagSak({ id: 10, steg: "UTREDNING", status: "AKTIV" }),
      lagSak({ id: 11, steg: "OPPRETTET" }),
      lagSak({ id: 12, steg: "ANMELDT" }),
    ];

    const resultat = filtrerSaker(ventendeSaker, {
      enhet: [],
      saksbehandler: [],
      kategori: [],
      misbrukstype: [],
      merking: [],
      steg: ALLE_STEG,
      status: ["VENTER_PA_INFORMASJON", "I_BERO", "HOS_FORVALTNING", "HOS_POLITI"],
    });

    expect(resultat.map((sak) => sak.id)).toEqual([1, 2, 3, 4, 5, 12]);
  });

  it("filtrerer på status", () => {
    const sakerMedStatus = [
      lagSak({ id: 500, status: "AKTIV" }),
      lagSak({ id: 501, status: "VENTER_PA_INFORMASJON" }),
      lagSak({ id: 502, status: null }),
    ];

    const resultat = filtrerSaker(sakerMedStatus, {
      enhet: [],
      saksbehandler: [],
      kategori: [],
      misbrukstype: [],
      merking: [],
      steg: [],
      status: ["AKTIV"],
    });

    expect(resultat.map((sak) => sak.id)).toEqual([500]);
  });

  it("lar statusvalg brukes enkeltvis og avgrenses av steg", () => {
    const sakerMedStatus = [
      lagSak({ id: 1, steg: "UTREDNING", status: "I_BERO" }),
      lagSak({ id: 2, steg: "FORVALTNING", status: "AKTIV" }),
      lagSak({ id: 3, steg: "POLITI", status: "I_BERO" }),
    ];
    const filter = {
      enhet: [],
      saksbehandler: [],
      kategori: [],
      misbrukstype: [],
      merking: [],
      steg: [],
    };
    expect(
      filtrerSaker(sakerMedStatus, { ...filter, status: ["HOS_FORVALTNING"] }).map((s) => s.id),
    ).toEqual([2]);
    expect(
      filtrerSaker(sakerMedStatus, { ...filter, status: ["I_BERO"] }).map((s) => s.id),
    ).toEqual([1, 3]);
    expect(
      filtrerSaker(sakerMedStatus, {
        ...filter,
        steg: ["UTREDNING"],
        status: ["I_BERO", "HOS_POLITI"],
      }).map((s) => s.id),
    ).toEqual([1]);
  });
});

describe("sorterSaker", () => {
  it("sorterer saksid numerisk (ikke leksikografisk)", () => {
    const saker = [lagSak({ id: 10 }), lagSak({ id: 2 }), lagSak({ id: 100 })];

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

  it("sorterer steg uavhengig av status", () => {
    const saker = [
      lagSak({ id: 1, steg: "UTREDES", status: "AKTIV" }),
      lagSak({ id: 2, steg: "OPPRETTET", status: "I_BERO" }),
    ];

    expect(sorterSaker(saker, "steg", "asc").map((sak) => sak.id)).toEqual([2, 1]);
  });

  it("sorterer null-status sammen med AKTIV", () => {
    const saker = [
      lagSak({ id: 3, status: "AKTIV" }),
      lagSak({ id: 2, status: null }),
      lagSak({ id: 4, status: "I_BERO" }),
      lagSak({ id: 1, status: "I_BERO" }),
    ];

    expect(sorterSaker(saker, "status", "asc").map((sak) => sak.id)).toEqual([3, 2, 4, 1]);
  });
});
