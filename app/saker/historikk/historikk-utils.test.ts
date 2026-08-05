import { describe, expect, it } from "vitest";
import type { SakHendelse } from "./typer";
import { hendelseBeskrivelse, hendelseTittel } from "./historikk-utils";

function lagHendelse(overrides: Partial<SakHendelse>): SakHendelse {
  return {
    hendelseId: "00000000-0000-0000-0000-000000000001",
    tidspunkt: "2025-01-01T12:00:00Z",
    hendelsesType: "STATUS_ENDRET",
    sakId: 1,
    status: "UTREDES",
    ytelseTyper: [],
    ...overrides,
  };
}

describe("hendelseBeskrivelse", () => {
  it("viser status for SAK_HENLAGT uten årsak i beskrivelsen", () => {
    const hendelse = lagHendelse({
      hendelsesType: "SAK_HENLAGT",
      status: "HENLAGT",
      henleggelsesarsak: "IKKE_KAPASITET",
    });

    const resultat = hendelseBeskrivelse(hendelse);

    expect(resultat).toContain("Status: Henlagt");
    expect(resultat).not.toContain("Årsak:");
  });

  it("viser SAK_HENLAGT uten årsak når henleggelsesarsak mangler", () => {
    const hendelse = lagHendelse({
      hendelsesType: "SAK_HENLAGT",
      status: "HENLAGT",
      henleggelsesarsak: null,
    });

    const resultat = hendelseBeskrivelse(hendelse);

    expect(resultat).not.toContain("Årsak:");
    expect(resultat).toContain("Status: Henlagt");
  });

  it("viser beskrivelse sammen med status for SAK_HENLAGT", () => {
    const hendelse = lagHendelse({
      hendelsesType: "SAK_HENLAGT",
      status: "HENLAGT",
      henleggelsesarsak: "FORELDET",
      beskrivelse: "Saken er for gammel",
    });

    const resultat = hendelseBeskrivelse(hendelse);

    expect(resultat).toContain("Saken er for gammel");
    expect(resultat).toContain("Status: Henlagt");
    expect(resultat).not.toContain("Årsak:");
  });
});

describe("FIL_LASTET_OPP og FIL_AVVIST_VIRUS", () => {
  it("viser virusskanning-beskrivelse for FIL_LASTET_OPP", () => {
    const hendelse = lagHendelse({
      hendelsesType: "FIL_LASTET_OPP",
      status: null,
      beskrivelse: "Virusskanning OK",
    });

    const resultat = hendelseBeskrivelse(hendelse);

    expect(resultat).toBe("Virusskanning OK");
  });

  it("returnerer null for FIL_LASTET_OPP uten beskrivelse", () => {
    const hendelse = lagHendelse({
      hendelsesType: "FIL_LASTET_OPP",
      status: null,
      beskrivelse: null,
    });

    const resultat = hendelseBeskrivelse(hendelse);

    expect(resultat).toBeNull();
  });

  it("viser riktig tittel for FIL_AVVIST_VIRUS", () => {
    const hendelse = lagHendelse({
      hendelsesType: "FIL_AVVIST_VIRUS",
      status: null,
    });

    expect(hendelseTittel(hendelse)).toBe("Fil avvist – virus oppdaget");
  });
});
