import { beforeEach, describe, expect, it } from "vitest";
import {
  arkiverFil,
  hentFilerForSak,
  hentFilInnhold,
  leggTilFil,
  opprettArkivertFilFraDokument,
  slettFil,
} from "./filer.server";
import { hentMockState, resetDefaultSession } from "./session.server";
import { tømFilInnholdslager } from "./fil-innhold.server";

const testRequest = new Request("http://localhost");
function state() {
  return hentMockState(testRequest);
}

const sakId = "1";

function lastOppPdf(navn: string) {
  return leggTilFil(
    state(),
    sakId,
    new File(["%PDF"], navn, { type: "application/pdf" }),
    "Ola Nordmann",
  );
}

describe("mock-store filer", () => {
  beforeEach(() => {
    resetDefaultSession();
    tømFilInnholdslager();
  });

  it("markerer en fil som arkivert med saksbehandler og journalpost", () => {
    const fil = lastOppPdf("rapport.pdf");

    const arkivert = arkiverFil(state(), sakId, fil.id, "Z999999", "demo-1");

    expect(arkivert).toMatchObject({
      id: fil.id,
      arkivertAv: "Z999999",
      arkivertJournalpostId: "demo-1",
    });
    expect(arkivert?.arkivert).toEqual(expect.any(String));
    expect(hentFilerForSak(state(), sakId).find((f) => f.id === fil.id)?.arkivert).toEqual(
      expect.any(String),
    );
  });

  it("returnerer null når filen ikke finnes", () => {
    expect(arkiverFil(state(), sakId, "finnes-ikke", "Z999999", "demo-1")).toBeNull();
  });

  it("returnerer null når filen allerede er arkivert", () => {
    const fil = lastOppPdf("rapport.pdf");
    arkiverFil(state(), sakId, fil.id, "Z999999", "demo-1");

    expect(arkiverFil(state(), sakId, fil.id, "Z999999", "demo-2")).toBeNull();
  });

  it("oppretter en arkivert PDF-fil fra et dokument", () => {
    const fil = opprettArkivertFilFraDokument(
      state(),
      sakId,
      { id: "1-1", tittel: "Saksframlegg" },
      "Z999999",
      "demo-1",
    );

    expect(fil).toMatchObject({
      filnavn: "Saksframlegg.pdf",
      contentType: "application/pdf",
      arkivertAv: "Z999999",
      arkivertJournalpostId: "demo-1",
      arkivertFraDokumentId: "1-1",
    });
    expect(hentFilerForSak(state(), sakId).some((f) => f.id === fil.id)).toBe(true);
  });

  it("bruker «Uten tittel» som filnavn for dokumenter uten tittel", () => {
    const fil = opprettArkivertFilFraDokument(
      state(),
      sakId,
      { id: "1-2", tittel: "" },
      "Z999999",
      "demo-1",
    );

    expect(fil.filnavn).toBe("Uten tittel.pdf");
  });

  it("returnerer opplastet innhold igjen ved nedlasting", async () => {
    const fil = leggTilFil(
      state(),
      sakId,
      new File(["bildebytes"], "bilde.png", { type: "image/png" }),
      "Ola Nordmann",
    );

    const respons = await hentFilInnhold(state(), sakId, fil.id);

    expect(respons.headers.get("Content-Type")).toBe("image/png");
    expect(await respons.text()).toBe("bildebytes");
  });

  it("gir en placeholder for seedede bilder uten innhold", async () => {
    const seedetBilde = hentFilerForSak(state(), sakId).find((f) => f.contentType === "image/png")!;

    const respons = await hentFilInnhold(state(), sakId, seedetBilde.id);

    expect(respons.headers.get("Content-Type")).toBe("image/svg+xml");
    expect(await respons.text()).toContain("<svg");
  });

  it("lagrer ikke innholdet for filer over størrelsesgrensen", async () => {
    const stor = new File([new Uint8Array(13 * 1024 * 1024)], "stor.png", {
      type: "image/png",
    });
    const fil = leggTilFil(state(), sakId, stor, "Ola Nordmann");

    const respons = await hentFilInnhold(state(), sakId, fil.id);

    expect(respons.headers.get("Content-Type")).toBe("image/svg+xml");
  });

  it("fjerner innholdet når filen slettes", async () => {
    const fil = leggTilFil(
      state(),
      sakId,
      new File(["bildebytes"], "bilde.png", { type: "image/png" }),
      "Ola Nordmann",
    );
    slettFil(state(), sakId, fil.id);

    const respons = await hentFilInnhold(state(), sakId, fil.id);

    expect(await respons.text()).not.toBe("bildebytes");
  });
});
