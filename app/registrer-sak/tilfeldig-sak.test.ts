import { describe, expect, it } from "vitest";
import { mockKodeverk } from "~/testing/mock-store/kodeverk.server";
import { erStøttetMiljøForTilfeldigSak, lagTilfeldigSak } from "./tilfeldig-sak";

describe("erStøttetMiljøForTilfeldigSak", () => {
  it.each(["local-backend", "local-dev", "local-mock", "demo", "dev"])(
    "tillater tilfeldig sak i %s",
    (miljø) => {
      expect(erStøttetMiljøForTilfeldigSak(miljø)).toBe(true);
    },
  );

  it("tillater ikke tilfeldig sak i prod", () => {
    expect(erStøttetMiljøForTilfeldigSak("prod")).toBe(false);
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
