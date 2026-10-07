import { describe, expect, it } from "vitest";
import { mockKodeverk } from "~/testing/mock-store/kodeverk.server";
import { lagTilfeldigSak, skalViseTilfeldigSak } from "./tilfeldig-sak";

describe("skalViseTilfeldigSak", () => {
  it.each(["local-backend", "local-dev", "local-mock", "demo"])(
    "viser alltid tilfeldig sak i %s",
    (miljø) => {
      expect(skalViseTilfeldigSak(miljø, false)).toBe(true);
      expect(skalViseTilfeldigSak(miljø, true)).toBe(true);
    },
  );

  it("viser tilfeldig sak i dev bare når feature-flagget er påskrudd", () => {
    expect(skalViseTilfeldigSak("dev", true)).toBe(true);
    expect(skalViseTilfeldigSak("dev", false)).toBe(false);
  });

  it("viser aldri tilfeldig sak i prod", () => {
    expect(skalViseTilfeldigSak("prod", true)).toBe(false);
    expect(skalViseTilfeldigSak("prod", false)).toBe(false);
  });
});

describe("lagTilfeldigSak", () => {
  it("lager en gyldig sammensatt sak fra kodeverket", () => {
    const sak = lagTilfeldigSak(mockKodeverk, () => 0);

    expect(sak).toEqual({
      kategori: "BEHANDLER",
      misbruktyper: ["BEHANDLER_25_7"],
      merkinger: ["LIME"],
      kilde: "PUBLIKUM",
      enhet: "ky153k",
      ytelser: [
        {
          type: "DAGPENGER",
          fraDato: "2025-01-01",
          tilDato: "2025-12-31",
          beløp: "20000",
        },
      ],
    });
  });

  it("returnerer null når kodeverket ikke kan fylle de påkrevde feltene", () => {
    expect(
      lagTilfeldigSak({
        ...mockKodeverk,
        kategorier: [],
      }),
    ).toBeNull();
  });
});
