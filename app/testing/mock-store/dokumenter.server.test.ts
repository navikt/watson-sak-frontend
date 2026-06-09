import { beforeEach, describe, expect, it } from "vitest";
import {
  hentDokument,
  hentDokumenttreForSak,
  lagreDokument,
  opprettDokument,
  registrerTomtDokumentområdeForSak,
} from "./dokumenter.server";
import { hentMockState, resetDefaultSession } from "./session.server";

const testRequest = new Request("http://localhost");
function state() {
  return hentMockState(testRequest);
}

// "102" har partall som siste tegn → saken har seedede dokumenter.
// "103" har oddetall → saken starter uten dokumenter.
const sakMedDokumenter = "102";
const sakUtenDokumenter = "103";

describe("mock-store dokumenter", () => {
  beforeEach(() => {
    resetDefaultSession();
  });

  it("seeder eksempeldokumenter for demosaker med dokumenter", () => {
    expect(hentDokumenttreForSak(state(), sakMedDokumenter)).not.toEqual([]);
  });

  it("lar saker uten seedede dokumenter starte tomt", () => {
    expect(hentDokumenttreForSak(state(), sakUtenDokumenter)).toEqual([]);
  });

  it("lar nyopprettede saker starte med tom dokumentliste", () => {
    registrerTomtDokumentområdeForSak(state(), sakMedDokumenter);
    expect(hentDokumenttreForSak(state(), sakMedDokumenter)).toEqual([]);
  });

  it("tilbakestiller dokumenter ved reset", () => {
    registrerTomtDokumentområdeForSak(state(), sakMedDokumenter);
    resetDefaultSession();
    expect(hentDokumenttreForSak(state(), sakMedDokumenter)).not.toEqual([]);
  });

  it("henter et seedet dokument med innhold", () => {
    const dokument = hentDokument(state(), sakMedDokumenter, "1-1");
    expect(dokument?.tittel).toBe("Saksframlegg");
    expect(dokument?.innhold.type).toBe("doc");
  });

  it("oppretter et tomt dokument som kan hentes igjen", () => {
    const { id } = opprettDokument(state(), sakUtenDokumenter, "Ola Nordmann");

    const dokument = hentDokument(state(), sakUtenDokumenter, id);
    expect(dokument?.tittel).toBe("Uten tittel");
    expect(dokument?.endretAv).toBe("Ola Nordmann");

    const tre = hentDokumenttreForSak(state(), sakUtenDokumenter);
    expect(tre.some((node) => node.id === id)).toBe(true);
  });

  it("lagrer tittel og innhold på et dokument", () => {
    const { id } = opprettDokument(state(), sakUtenDokumenter, "Ola Nordmann");
    const nyttInnhold = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Oppdatert" }] }],
    };

    const oppdatert = lagreDokument(state(), sakUtenDokumenter, id, {
      tittel: "Mitt notat",
      innhold: nyttInnhold,
      endretAv: "Kari Hansen",
    });

    expect(oppdatert?.tittel).toBe("Mitt notat");

    const lagret = hentDokument(state(), sakUtenDokumenter, id);
    expect(lagret?.tittel).toBe("Mitt notat");
    expect(lagret?.endretAv).toBe("Kari Hansen");
    expect(lagret?.innhold).toEqual(nyttInnhold);
  });

  it("returnerer undefined når man lagrer et ukjent dokument", () => {
    const resultat = lagreDokument(state(), sakMedDokumenter, "finnes-ikke", {
      tittel: "x",
      innhold: { type: "doc" },
      endretAv: "Ola Nordmann",
    });
    expect(resultat).toBeUndefined();
  });
});
