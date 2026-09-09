import { beforeEach, describe, expect, it } from "vitest";
import { hentMockState, resetDefaultSession } from "~/testing/mock-store/session.server";
import { lagMockLederStatistikk } from "./mock.server";

const request = new Request("http://localhost");

describe("lagMockLederStatistikk", () => {
  beforeEach(() => {
    resetDefaultSession();
  });

  it("følger backendreglene for status arbeidsstatus frist ansatte og ufordelt", () => {
    const state = hentMockState(request);
    const grunnlag = state.kontrollsaker[0];
    if (!grunnlag) throw new Error("Mangler kontrollsak i mockgrunnlaget");
    state.mineKontrollsaker = [];
    state.kontrollsaker = [
      {
        ...grunnlag,
        id: 1,
        enhet: "ky153k",
        status: "ANMELDT",
        blokkert: null,
        oppdatert: "2026-03-01T22:59:59Z",
        saksbehandlere: { ...grunnlag.saksbehandlere, eier: null },
      },
      {
        ...grunnlag,
        id: 2,
        enhet: "ky153k",
        status: "HENLAGT",
        blokkert: "I_BERO",
        oppdatert: "2026-03-01T23:00:00Z",
        saksbehandlere: {
          ...grunnlag.saksbehandlere,
          eier: { navIdent: "Z234567", navn: "Ada Larsen", enhet: "ky153k" },
        },
      },
      {
        ...grunnlag,
        id: 3,
        enhet: "ky153k",
        status: "UTREDES",
        blokkert: "VENTER_PA_VEDTAK",
        oppdatert: null,
        saksbehandlere: {
          ...grunnlag.saksbehandlere,
          eier: { navIdent: "Z234567", navn: "Ada Larsen", enhet: "ky153k" },
        },
      },
      {
        ...grunnlag,
        id: 4,
        enhet: "ky153k",
        status: "AVSLUTTET",
        blokkert: null,
        oppdatert: "2020-01-01T00:00:00Z",
      },
    ];

    const resultat = lagMockLederStatistikk(
      request,
      "ky153k",
      "Øst",
      new Date("2026-03-31T12:00:00Z"),
    );

    expect(resultat.enhet.totaltAntallIkkeAvsluttede).toBe(3);
    expect(resultat.enhet.antallOverFrist).toBe(1);
    expect(resultat.enhet.perStatus.ANMELDT).toBe(1);
    expect(resultat.enhet.perStatus.HENLAGT).toBe(1);
    expect(resultat.enhet.perArbeidsstatus.IKKE_BLOKKERT).toBe(1);
    expect(resultat.enhet.perArbeidsstatus.I_BERO).toBe(1);
    expect(resultat.enhet.perArbeidsstatus.VENTER_PA_VEDTAK).toBe(1);
    expect(resultat.ansatte.liste.find((ansatt) => ansatt.navIdent === "Z234567")).toEqual(
      expect.objectContaining({
        totaltAntallIkkeAvsluttede: 2,
        antallOverFrist: 0,
      }),
    );
    expect(resultat.ansatte.liste.some((ansatt) => ansatt.totaltAntallIkkeAvsluttede === 0)).toBe(
      true,
    );
    expect(resultat.ansatte.ufordelt).toEqual({
      totaltAntallIkkeAvsluttede: 1,
      antallOverFrist: 1,
    });
  });
});
