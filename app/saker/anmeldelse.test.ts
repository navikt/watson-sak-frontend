import { describe, expect, it } from "vitest";
import {
  finnEndredeAnmeldelsesfelter,
  hentAnmeldelseForVisning,
  kanRedigereAnmeldelse,
  lesAnmeldelseFraSkjema,
  redigerAnmeldelseSchema,
} from "./anmeldelse";
import type { KontrollsakResponse } from "./types.backend";

function lagSak(
  steg: KontrollsakResponse["steg"],
  strafferettsligVurdering?: NonNullable<
    KontrollsakResponse["resultat"]
  >["strafferettsligVurdering"],
): KontrollsakResponse {
  return { steg, resultat: { strafferettsligVurdering } } as KontrollsakResponse;
}

describe("hentAnmeldelseForVisning", () => {
  const anmeldt = { type: "ANMELDT", anmeldtBelop: 5000, politidistrikt: "Øst politidistrikt" };

  it("viser anmeldelsen hos politiet og etter avslutning", () => {
    expect(hentAnmeldelseForVisning(lagSak("POLITI", anmeldt))).toEqual({
      anmeldtBelop: 5000,
      politidistrikt: "Øst politidistrikt",
    });
    expect(hentAnmeldelseForVisning(lagSak("AVSLUTTET", anmeldt))).not.toBeNull();
  });

  it("viser ikke anmeldelsen før saken er hos politiet eller uten beløp", () => {
    expect(hentAnmeldelseForVisning(lagSak("STRAFFERETTSLIG_VURDERING", anmeldt))).toBeNull();
    expect(
      hentAnmeldelseForVisning(lagSak("POLITI", { ...anmeldt, anmeldtBelop: null })),
    ).toBeNull();
    expect(hentAnmeldelseForVisning(lagSak("AVSLUTTET", { type: "HENLAGT" }))).toBeNull();
  });

  it("gir null for manglende eller blankt politidistrikt", () => {
    expect(
      hentAnmeldelseForVisning(lagSak("POLITI", { ...anmeldt, politidistrikt: null }))
        ?.politidistrikt,
    ).toBeNull();
    expect(
      hentAnmeldelseForVisning(lagSak("POLITI", { ...anmeldt, politidistrikt: "  " }))
        ?.politidistrikt,
    ).toBeNull();
  });
});

describe("kanRedigereAnmeldelse", () => {
  it("tillater redigering bare for anmeldte saker hos politiet", () => {
    expect(kanRedigereAnmeldelse(lagSak("POLITI", { type: "ANMELDT" }))).toBe(true);
    expect(kanRedigereAnmeldelse(lagSak("POLITI", { type: "HENLAGT" }))).toBe(false);
    expect(kanRedigereAnmeldelse(lagSak("POLITI"))).toBe(false);
    expect(kanRedigereAnmeldelse(lagSak("AVSLUTTET", { type: "ANMELDT" }))).toBe(false);
    expect(kanRedigereAnmeldelse(lagSak("STRAFFERETTSLIG_VURDERING", { type: "ANMELDT" }))).toBe(
      false,
    );
  });
});

describe("redigerAnmeldelseSchema", () => {
  const gyldig = { anmeldtBelop: "12 500,50", politidistrikt: "  Øst politidistrikt " };

  it("trimmer politidistrikt og tolker norsk beløp", () => {
    expect(redigerAnmeldelseSchema.parse(gyldig)).toEqual({
      anmeldtBelop: 12500.5,
      politidistrikt: "Øst politidistrikt",
    });
  });

  it.each(["", "   ", "Øst", "Oslo\npolitidistrikt", "Ukjent politidistrikt"])(
    "avviser politidistrikt som ikke er i listen %j",
    (politidistrikt) => {
      expect(redigerAnmeldelseSchema.safeParse({ ...gyldig, politidistrikt }).success).toBe(false);
    },
  );

  it.each(["", "1,234", "-5", "abc"])("avviser ugyldig beløp %j", (anmeldtBelop) => {
    expect(redigerAnmeldelseSchema.safeParse({ ...gyldig, anmeldtBelop }).success).toBe(false);
  });
});

describe("finnEndredeAnmeldelsesfelter", () => {
  const sak = lagSak("POLITI", { type: "ANMELDT", anmeldtBelop: 5000, politidistrikt: "Øst" });

  it("finner bare feltene som faktisk endres", () => {
    expect(
      finnEndredeAnmeldelsesfelter(sak, { anmeldtBelop: 5000, politidistrikt: "Øst" }),
    ).toEqual([]);
    expect(
      finnEndredeAnmeldelsesfelter(sak, { anmeldtBelop: 5000, politidistrikt: "Vest" }),
    ).toEqual(["politidistrikt"]);
    expect(
      finnEndredeAnmeldelsesfelter(sak, { anmeldtBelop: 6000, politidistrikt: "Vest" }),
    ).toEqual(["anmeldt beløp", "politidistrikt"]);
  });
});

describe("lesAnmeldelseFraSkjema", () => {
  it("rapporterer at feltene ikke er sendt når skjemaet mangler dem", () => {
    const formData = new FormData();
    formData.set("kategori", "ARBEID");
    expect(lesAnmeldelseFraSkjema(formData)).toEqual({ sendt: false });
  });

  it("validerer feltene når de er sendt", () => {
    const formData = new FormData();
    formData.set("anmeldtBelop", "1000");
    formData.set("politidistrikt", "");
    const lest = lesAnmeldelseFraSkjema(formData);
    expect(lest.sendt).toBe(true);
    if (lest.sendt) expect(lest.resultat.success).toBe(false);
  });
});
