import { describe, expect, it } from "vitest";
import { lagRegistrerSakDatepickerValg } from "./registrerSakDatepicker";

describe("lagRegistrerSakDatepickerValg", () => {
  it("slår på dropdownCaption med en bred datoperiode", () => {
    const valg = lagRegistrerSakDatepickerValg();

    expect(valg.dropdownCaption).toBe(true);
    expect(valg.fromDate).toEqual(new Date(1900, 0, 1));
    expect(valg.toDate).toEqual(new Date(2100, 11, 31));
  });

  it("normaliserer klokkeslettet i oppgitt maksdato", () => {
    const valg = lagRegistrerSakDatepickerValg(new Date(2030, 5, 15, 18, 45));

    expect(valg.toDate).toEqual(new Date(2030, 5, 15));
  });

  it("deaktiverer datoer etter valgt maksdato", () => {
    const valg = lagRegistrerSakDatepickerValg(new Date(2030, 5, 15, 18, 45));

    expect(valg.disabled).toEqual([{ after: new Date(2030, 5, 15) }]);
  });
});
