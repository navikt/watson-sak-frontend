import { describe, expect, it } from "vitest";
import { oppgavefeltSkjema } from "./oppgavefelt";

const gyldig = {
  oppgavetype: "VUR",
  prioritet: "NORMAL",
  frist: "2027-01-01",
  behandlendeEnhet: "4100",
  beskrivelse: "En beskrivelse",
};

describe("oppgavefeltSkjema", () => {
  it("krever gjelderverdi som standard", () => {
    const resultat = oppgavefeltSkjema.safeParse(gyldig);

    expect(resultat.error?.issues).toEqual([
      expect.objectContaining({ path: ["gjelderverdi"], message: "Velg gjelderverdi" }),
    ]);
  });

  it("godtar gjelderverdi når temaet har gjelderverdier", () => {
    expect(
      oppgavefeltSkjema.safeParse({ ...gyldig, gjelderverdi: "ab0356", gjelderverdiPåkrevd: "ja" })
        .success,
    ).toBe(true);
  });

  it("godtar manglende gjelderverdi når temaet ikke har gjelderverdier", () => {
    expect(oppgavefeltSkjema.safeParse({ ...gyldig, gjelderverdiPåkrevd: "nei" }).success).toBe(
      true,
    );
  });
});
