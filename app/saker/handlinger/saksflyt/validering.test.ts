import { describe, expect, it } from "vitest";
import { validerTrinn } from "./validering";
import { lagTillatteHandlinger } from "./testdata";

const bekreftAvslutning = { type: "bekreftAvslutning", primær: "Avslutt sak" } as const;
const melding =
  "Du må bekrefte at saken er ferdig flyttet før du kan avslutte den. Huk av i sjekklisten for flytting på saken.";

describe("validerTrinn for bekreftAvslutning", () => {
  it("krever ferdig flytting når flagget er satt", () => {
    expect(validerTrinn(bekreftAvslutning, {}, lagTillatteHandlinger(), true)).toEqual({
      "": melding,
    });
  });

  it("tillater avslutning når flagget ikke er satt", () => {
    expect(validerTrinn(bekreftAvslutning, {}, lagTillatteHandlinger())).toEqual({});
  });
});
