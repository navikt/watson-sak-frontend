import { describe, expect, it } from "vitest";
import { politianmeldelseSkjemaRefinert, politianmeldelseSkjemaSchema } from "./typer";

describe("politianmeldelseSkjemaSchema", () => {
  it("godkjenner gyldig skjema", () => {
    const resultat = politianmeldelseSkjemaSchema.safeParse({
      valgteFiler: ["fil-1"],
      valgteJournalposter: ["jp-1"],
      funn: "Fant noe mistenkelig",
      vurdering: "Trolig feil",
      anbefaling: "Bør følges opp",
    });
    expect(resultat.success).toBe(true);
  });

  it("feiler når funn er tomt", () => {
    const resultat = politianmeldelseSkjemaSchema.safeParse({
      valgteFiler: ["fil-1"],
      valgteJournalposter: [],
      funn: "",
      vurdering: "Vurdering",
      anbefaling: "Anbefaling",
    });
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      const feil = resultat.error.flatten().fieldErrors;
      expect(feil.funn).toBeDefined();
    }
  });

  it("feiler når vurdering er tomt", () => {
    const resultat = politianmeldelseSkjemaSchema.safeParse({
      valgteFiler: ["fil-1"],
      valgteJournalposter: [],
      funn: "Funn",
      vurdering: "",
      anbefaling: "Anbefaling",
    });
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      const feil = resultat.error.flatten().fieldErrors;
      expect(feil.vurdering).toBeDefined();
    }
  });

  it("feiler når anbefaling er tomt", () => {
    const resultat = politianmeldelseSkjemaSchema.safeParse({
      valgteFiler: [],
      valgteJournalposter: ["jp-1"],
      funn: "Funn",
      vurdering: "Vurdering",
      anbefaling: "",
    });
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      const feil = resultat.error.flatten().fieldErrors;
      expect(feil.anbefaling).toBeDefined();
    }
  });
});

describe("politianmeldelseSkjemaRefinert", () => {
  it("feiler når ingen dokumenter er valgt", () => {
    const resultat = politianmeldelseSkjemaRefinert.safeParse({
      valgteFiler: [],
      valgteJournalposter: [],
      funn: "Funn",
      vurdering: "Vurdering",
      anbefaling: "Anbefaling",
    });
    expect(resultat.success).toBe(false);
    if (!resultat.success) {
      const harDokumentFeil = resultat.error.issues.some((issue) =>
        issue.path.includes("dokumenter"),
      );
      expect(harDokumentFeil).toBe(true);
    }
  });

  it("godkjenner når bare filer er valgt", () => {
    const resultat = politianmeldelseSkjemaRefinert.safeParse({
      valgteFiler: ["fil-1"],
      valgteJournalposter: [],
      funn: "Funn",
      vurdering: "Vurdering",
      anbefaling: "Anbefaling",
    });
    expect(resultat.success).toBe(true);
  });

  it("godkjenner når bare journalposter er valgt", () => {
    const resultat = politianmeldelseSkjemaRefinert.safeParse({
      valgteFiler: [],
      valgteJournalposter: ["jp-1"],
      funn: "Funn",
      vurdering: "Vurdering",
      anbefaling: "Anbefaling",
    });
    expect(resultat.success).toBe(true);
  });
});
