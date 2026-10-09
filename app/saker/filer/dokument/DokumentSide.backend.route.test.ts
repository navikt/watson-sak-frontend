import { data } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KontrollsakResponse } from "~/saker/types.backend";
import type { Route } from "./+types/DokumentSide.route";
import { lagListe } from "./kommentarer/kommentar-fixtures";

const mockHentKontrollsak = vi.fn();
const mockHentDokument = vi.fn();
const mockHentDokumentHistorikk = vi.fn();
const mockHentKommentarliste = vi.fn();

vi.mock("~/config/env.server", () => ({
  skalBrukeMockdata: false,
  env: { ENVIRONMENT: "dev" },
}));

vi.mock("~/auth/access-token", () => ({
  getBackendOboToken: vi.fn().mockResolvedValue("mock-token"),
}));

vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: vi.fn().mockResolvedValue({
    navIdent: "Z999999",
    name: "Test Saksbehandler",
    erLeder: false,
  }),
}));

vi.mock("~/saker/api.server", () => ({
  hentKontrollsak: mockHentKontrollsak,
  hentDokument: mockHentDokument,
  hentDokumentHistorikk: mockHentDokumentHistorikk,
}));

vi.mock("../mapper/mapper.server", () => ({
  hentMapperstier: async () => [],
  hentMapperstierFraMock: () => [],
}));

vi.mock("./kommentarer/kommentarer.api.server", () => ({
  hentKommentarliste: mockHentKommentarliste,
}));

const sak = {
  id: 42,
  status: "UTREDES",
  personNavn: "Ola Nordmann",
  personIdent: "01010112345",
  enhet: "4812",
  dokumenter: [],
  saksbehandlere: {
    eier: { navIdent: "Z999999", navn: "Test Saksbehandler", enhet: "4812" },
    deltMed: [],
  },
} as unknown as KontrollsakResponse;

describe("DokumentSide loader — kommentarfeil", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHentKontrollsak.mockResolvedValue(sak);
    mockHentDokument.mockResolvedValue({
      id: "d1",
      tittel: "Rapport",
      innhold: [{ type: "p", children: [{ text: "Innhold" }] }],
      arkivert: null,
    });
    mockHentDokumentHistorikk.mockResolvedValue({ items: [] });
  });

  it("viser dokumentet med retry-status ved ordinær kommentarfeil", async () => {
    mockHentKommentarliste.mockRejectedValue(new Error("Backend utilgjengelig"));

    const resultat = await hent();

    expect(resultat.kommentarinnlastingFeilet).toBe(true);
    expect(resultat.kommentarliste.traader).toEqual([]);
    expect(resultat.kommentarliste.kanKommentere).toBe(false);
  });

  it("lar utløpt sesjon propagere til rutens 401-håndtering", async () => {
    mockHentKommentarliste.mockRejectedValue(
      data("Sesjonen er utløpt. Logg inn på nytt.", { status: 401 }),
    );

    await expect(hent()).rejects.toMatchObject({ init: { status: 401 } });
  });

  it("returnerer kommentarer uten feilstatus når kallet lykkes", async () => {
    mockHentKommentarliste.mockResolvedValue(lagListe());

    const resultat = await hent();

    expect(resultat.kommentarinnlastingFeilet).toBe(false);
    expect(resultat.kommentarliste.traader).toHaveLength(1);
  });
});

describe("DokumentSide loader — avsluttet sak", () => {
  const avsluttetSak = {
    ...sak,
    steg: "AVSLUTTET",
    saksbehandlere: { eier: null, deltMed: [] },
  } as unknown as KontrollsakResponse;

  beforeEach(() => {
    vi.clearAllMocks();
    mockHentKontrollsak.mockResolvedValue(avsluttetSak);
    mockHentDokument.mockResolvedValue({
      id: "d1",
      tittel: "Rapport",
      innhold: [{ type: "p", children: [{ text: "Innhold" }] }],
      arkivert: "2026-09-01T10:00:00",
    });
    mockHentKommentarliste.mockResolvedValue(lagListe());
  });

  it("viser arkivert dokument for saksbehandler uten direkte tilgang", async () => {
    mockHentDokumentHistorikk.mockRejectedValue(data("Dokument ikke funnet", { status: 404 }));

    const resultat = await hent();

    expect(resultat.dokument.id).toBe("d1");
    expect(resultat.dokumentHistorikk).toEqual([]);
    expect(resultat.kanRedigere).toBe(false);
    expect(resultat.kanEndreMapper).toBe(false);
  });

  it("avviser saksbehandler uten direkte tilgang på aktiv sak", async () => {
    mockHentKontrollsak.mockResolvedValue({ ...avsluttetSak, steg: "UTREDES" });
    mockHentDokumentHistorikk.mockResolvedValue({ items: [] });

    await expect(hent()).rejects.toMatchObject({ init: { status: 403 } });
  });
});

describe("DokumentSide loader — kanEndreMapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHentDokument.mockResolvedValue({
      id: "d1",
      tittel: "Rapport",
      innhold: [{ type: "p", children: [{ text: "Innhold" }] }],
      arkivert: null,
    });
    mockHentDokumentHistorikk.mockResolvedValue({ items: [] });
    mockHentKommentarliste.mockResolvedValue(lagListe());
  });

  it("er sann for saksbehandler med direkte tilgang på aktiv sak", async () => {
    mockHentKontrollsak.mockResolvedValue({ ...sak, steg: "UTREDES" });

    const resultat = await hent();

    expect(resultat.kanEndreMapper).toBe(true);
  });

  it("er usann når saken er avsluttet", async () => {
    mockHentKontrollsak.mockResolvedValue({ ...sak, steg: "AVSLUTTET" });

    const resultat = await hent();

    expect(resultat.kanEndreMapper).toBe(false);
  });
});

async function hent() {
  const { loader } = await import("./DokumentSide.server");
  return loader({
    request: new Request("http://localhost/saker/SAK-42/dokumenter/d1"),
    params: { sakId: "SAK-42", docId: "d1" },
  } as Route.LoaderArgs);
}
