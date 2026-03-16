import { describe, expect, it } from "vitest";
import { videresendingSkjemaRefinert, videresendingSkjemaSchema } from "./typer";

describe("videresendingSkjemaSchema", () => {
  it("godkjenner gyldig skjema", () => {
    const resultat = videresendingSkjemaSchema.safeParse({
      mottaker: "nay",
      valgteFiler: ["fil-1"],
      valgteJournalposter: ["jp-1"],
      funn: "Fant noe mistenkelig",
      vurdering: "Trolig feil",
      anbefaling: "Bør følges opp",
    });
    expect(resultat.success).toBe(true);
  });

  it("feiler når mottaker mangler", () => {
    const resultat = videresendingSkjemaSchema.safeParse({
      valgteFiler: ["fil-1"],
      valgteJournalposter: [],
      funn: "Funn",
      vurdering: "Vurdering",
      anbefaling: "Anbefaling",
    });
    expect(resultat.success).toBe(false);
  });

  it("feiler for ugyldig mottaker", () => {
    const resultat = videresendingSkjemaSchema.safeParse({
      mottaker: "ugyldig",
      valgteFiler: [],
      valgteJournalposter: [],
      funn: "Funn",
      vurdering: "Vurdering",
      anbefaling: "Anbefaling",
    });
    expect(resultat.success).toBe(false);
  });

  it("feiler når funn er tomt", () => {
    const resultat = videresendingSkjemaSchema.safeParse({
      mottaker: "nfp",
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
    const resultat = videresendingSkjemaSchema.safeParse({
      mottaker: "nay",
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
    const resultat = videresendingSkjemaSchema.safeParse({
      mottaker: "nfp",
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

describe("videresendingSkjemaRefinert", () => {
  it("feiler når ingen dokumenter er valgt", () => {
    const resultat = videresendingSkjemaRefinert.safeParse({
      mottaker: "nay",
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
    const resultat = videresendingSkjemaRefinert.safeParse({
      mottaker: "nay",
      valgteFiler: ["fil-1"],
      valgteJournalposter: [],
      funn: "Funn",
      vurdering: "Vurdering",
      anbefaling: "Anbefaling",
    });
    expect(resultat.success).toBe(true);
  });

  it("godkjenner når bare journalposter er valgt", () => {
    const resultat = videresendingSkjemaRefinert.safeParse({
      mottaker: "nfp",
      valgteFiler: [],
      valgteJournalposter: ["jp-1"],
      funn: "Funn",
      vurdering: "Vurdering",
      anbefaling: "Anbefaling",
    });
    expect(resultat.success).toBe(true);
  });
});
