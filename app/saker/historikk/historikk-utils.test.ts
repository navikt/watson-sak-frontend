import { describe, expect, it } from "vitest";
import type { SakHendelse } from "./typer";
import { hendelseBeskrivelse } from "./historikk-utils";

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
