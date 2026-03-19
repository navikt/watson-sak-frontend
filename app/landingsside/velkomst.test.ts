import { describe, expect, test } from "vitest";
import type { Sak } from "~/saker/typer";
import { lagVelkomstOppsummering } from "./velkomst";

function lagSak(overstyringer: Partial<Sak> = {}): Sak {
  return {
    id: "test-1",
    datoInnmeldt: "2026-03-01",
    kilde: "telefon",
    notat: "Testnotat",
    fødselsnummer: "12345678901",
    ytelser: ["Dagpenger"],
    status: "tips mottatt",
    seksjon: "Seksjon A",
    tags: [],
    ...overstyringer,
  };
}

describe("lagVelkomstOppsummering", () => {
  test("oppsummerer de to mest relevante arbeidstypene", () => {
    const saker: Sak[] = [
      lagSak({ id: "1", status: "tips mottatt" }),
      lagSak({ id: "2", status: "tips mottatt" }),
      lagSak({ id: "3", status: "under utredning" }),
      lagSak({ id: "4", status: "under utredning" }),
      lagSak({ id: "5", status: "videresendt til nay/nfp" }),
    ];

    expect(lagVelkomstOppsummering(saker)).toBe(
      "Akkurat nå har du 2 tips til vurdering og 2 saker til utredning.",
    );
  });

  test("viser en oppmuntrende tekst når brukeren ikke har aktive saker", () => {
    const saker: Sak[] = [
      lagSak({ id: "1", status: "tips avklart" }),
      lagSak({ id: "2", status: "henlagt" }),
      lagSak({ id: "3", status: "avsluttet" }),
    ];

    expect(lagVelkomstOppsummering(saker)).toBe(
      "Er du klar for nye oppgaver? Du har ingen saker hos deg akkurat nå.",
    );
  });

  test("tar med ventende saker når de utgjør en større del av arbeidsbildet", () => {
    const saker: Sak[] = [
      lagSak({ id: "1", status: "videresendt til nay/nfp" }),
      lagSak({ id: "2", status: "videresendt til nay/nfp" }),
      lagSak({ id: "3", status: "videresendt til nay/nfp" }),
      lagSak({ id: "4", status: "under utredning" }),
    ];

    expect(lagVelkomstOppsummering(saker)).toBe(
      "Akkurat nå har du 3 saker som venter på svar fra NAY/NFP og 1 sak til utredning.",
    );
  });
});
