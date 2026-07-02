import { beforeEach, describe, expect, it, vi } from "vitest";
import { leggTilMockSakIFordeling } from "~/testing/mock-store/alle-saker.server";
import { hentMockState, resetDefaultSession } from "~/testing/mock-store/session.server";
import { søkSaker } from "./søk.server";

vi.mock("~/config/env.server", () => ({
  BACKEND_API_URL: "https://backend.test",
  skalBrukeMockdata: true,
}));

const testRequest = new Request("http://localhost");
function state() {
  return hentMockState(testRequest);
}

describe("søkSaker", () => {
  beforeEach(() => {
    resetDefaultSession();
  });

  it("finner sak på personIdent (fødselsnummer)", async () => {
    const { søketype, resultater } = await søkSaker(testRequest, "11223344556");

    expect(søketype).toBe("personIdent");
    expect(resultater.some((sak) => sak.id === 201)).toBe(true);
  });

  it("finner nøyaktig én sak på saksnummer", async () => {
    const { søketype, resultater } = await søkSaker(testRequest, "1028");

    expect(søketype).toBe("saksnummer");
    expect(resultater.map((sak) => sak.id)).toEqual([1028]);
  });

  it("gir 0 treff for et saksnummer som ikke finnes", async () => {
    const { søketype, resultater } = await søkSaker(testRequest, "999999");

    expect(søketype).toBe("saksnummer");
    expect(resultater).toEqual([]);
  });

  it("gjenkjenner organisasjonsnummer som egen søketype", async () => {
    const { søketype, resultater } = await søkSaker(testRequest, "123456789");

    expect(søketype).toBe("organisasjonsnummer");
    expect(resultater).toEqual([]);
  });

  it("finner saker koblet til et organisasjonsnummer i mock-modus", async () => {
    const nySak = leggTilMockSakIFordeling(state(), {
      personIdent: "10987654321",
      kategori: "ARBEID",
      kilde: "A_KRIMSAMARBEID",
      misbruktype: ["SVART_ARBEID"],
      prioritet: "NORMAL",
      arbeidsgivere: ["987654321"],
      ytelser: [],
    });

    const { søketype, resultater } = await søkSaker(testRequest, "987654321");

    expect(søketype).toBe("organisasjonsnummer");
    expect(resultater.map((sak) => sak.id)).toEqual([nySak.id]);
  });

  it("gir ingen treff for fritekst som verken er fnr, saksnummer eller orgnr", async () => {
    const { søketype, resultater } = await søkSaker(testRequest, "Arbeid");

    expect(søketype).toBe("ukjent");
    expect(resultater).toEqual([]);
  });

  it("gir ingen treff for tom søketekst", async () => {
    const { søketype, resultater } = await søkSaker(testRequest, "   ");

    expect(søketype).toBe("ukjent");
    expect(resultater).toEqual([]);
  });
});
