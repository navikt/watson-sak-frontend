import { describe, expect, it } from "vitest";
import { lagMockStatistikk } from "./mock.server";

describe("lagMockStatistikk", () => {
  it("lager alle datasett som statistikksiden trenger", () => {
    const resultat = lagMockStatistikk(
      { nivaa: "underavdeling", fra: "2026-09-01", til: "2026-09-30" },
      "Øst",
      "ky153k",
    );

    expect(resultat.valgtOmfang).toBe("underavdeling");
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
  });
});
