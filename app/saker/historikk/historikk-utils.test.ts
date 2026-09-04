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

  it("viser hvilke felter som ble endret for SAKSINFORMASJON_ENDRET", () => {
    const hendelse = lagHendelse({
      hendelsesType: "SAKSINFORMASJON_ENDRET",
      beskrivelse: "Endret kategori og ytelser.",
    });

    expect(hendelseBeskrivelse(hendelse)).toBe("Endret kategori og ytelser.");
  });

  it("faller tilbake til status for SAKSINFORMASJON_ENDRET uten beskrivelse", () => {
    const hendelse = lagHendelse({ hendelsesType: "SAKSINFORMASJON_ENDRET" });

    expect(hendelseBeskrivelse(hendelse)).toBe("Status: Utredes");
  });
});

describe("filhendelser", () => {
  it("hendelseTittel returnerer 'Fil slettet' for FIL_SLETTET", () => {
    const hendelse = lagHendelse({ hendelsesType: "FIL_SLETTET", status: null });
    expect(hendelseTittel(hendelse)).toBe("Fil slettet");
  });

  it("hendelseTittel returnerer 'Fil åpnet' for FIL_ÅPNET", () => {
    const hendelse = lagHendelse({ hendelsesType: "FIL_ÅPNET", status: null });
    expect(hendelseTittel(hendelse)).toBe("Fil åpnet");
  });

  it("hendelseTittel returnerer 'Fil arkivert' for FIL_ARKIVERT", () => {
    const hendelse = lagHendelse({ hendelsesType: "FIL_ARKIVERT", status: null });
    expect(hendelseTittel(hendelse)).toBe("Fil arkivert");
  });

  it("hendelseBeskrivelse returnerer beskrivelse fra hendelsen for FIL_ARKIVERT", () => {
    const hendelse = lagHendelse({
      hendelsesType: "FIL_ARKIVERT",
      status: null,
      beskrivelse: "Arkivert på journalpost 12345",
    });
    expect(hendelseBeskrivelse(hendelse)).toBe("Arkivert på journalpost 12345");
  });

  it("hendelseBeskrivelse returnerer null for FIL_LASTET_OPP uten beskrivelse", () => {
    const hendelse = lagHendelse({ hendelsesType: "FIL_LASTET_OPP", status: null });
    expect(hendelseBeskrivelse(hendelse)).toBeNull();
  });

  it("hendelseBeskrivelse returnerer null for FIL_SLETTET", () => {
    const hendelse = lagHendelse({ hendelsesType: "FIL_SLETTET", status: null });
    expect(hendelseBeskrivelse(hendelse)).toBeNull();
  });

  it("hendelseBeskrivelse returnerer null for FIL_ÅPNET", () => {
    const hendelse = lagHendelse({ hendelsesType: "FIL_ÅPNET", status: null });
    expect(hendelseBeskrivelse(hendelse)).toBeNull();
  });

  it("hendelseBeskrivelse returnerer beskrivelse fra hendelsen for FIL_LASTET_OPP med beskrivelse", () => {
    const hendelse = lagHendelse({
      hendelsesType: "FIL_LASTET_OPP",
      status: null,
      beskrivelse: "Virusskanning OK",
    });
    expect(hendelseBeskrivelse(hendelse)).toBe("Virusskanning OK");
  });
});
