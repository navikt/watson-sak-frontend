import { describe, expect, it } from "vitest";
import { lagRegistrerSakDatepickerValg } from "./registrerSakDatepicker";

describe("lagRegistrerSakDatepickerValg", () => {
  it("slår på dropdownCaption med datogrense 10 år tilbake i tid", () => {
    const valg = lagRegistrerSakDatepickerValg(new Date(2030, 5, 15, 18, 45));

    expect(valg.dropdownCaption).toBe(true);
    expect(valg.fromDate).toEqual(new Date(2020, 5, 15));
    expect(valg.toDate).toEqual(new Date(2030, 5, 15));
  });

  it("normaliserer klokkeslettet i oppgitt maksdato", () => {
    const valg = lagRegistrerSakDatepickerValg(new Date(2030, 5, 15, 18, 45));

    expect(valg.toDate).toEqual(new Date(2030, 5, 15));
  });

  it("deaktiverer datoer etter valgt maksdato", () => {
    const valg = lagRegistrerSakDatepickerValg(new Date(2030, 5, 15, 18, 45));

    expect(valg.disabled).toEqual([
      { before: new Date(2020, 5, 15) },
      { after: new Date(2030, 5, 15) },
    ]);
  });
});
