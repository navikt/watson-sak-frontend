import { afterEach, describe, expect, it, vi } from "vitest";
import type { Route } from "./+types/RegistrerSakSide.route";

const testState = vi.hoisted(() => ({
  skalBrukeMockdata: true,
}));

const getBackendOboTokenMock = vi.fn().mockResolvedValue("token-123");

vi.mock("./api.server", () => ({
  opprettKontrollsak: vi.fn().mockResolvedValue({ id: "00000000-0000-4000-8000-000000301000" }),
}));

vi.mock("~/auth/access-token", () => ({
  getBackendOboToken: getBackendOboTokenMock,
}));

vi.mock("~/config/env.server", () => ({
  get skalBrukeMockdata() {
    return testState.skalBrukeMockdata;
  },
}));

vi.mock("./person-oppslag.mock.server", () => ({
  slaOppPerson: vi.fn((fnr: string) =>
    fnr === "12345678901"
      ? {
          person: {
            navn: "Ola Testesen",
            personnummer: "12345678901",
            alder: 30,
          },
          eksisterendeSaker: [],
        }
      : null,
  ),
}));

function lagFormDataMedMinimum(overrides: Partial<Record<string, string>> = {}) {
  const formData = new FormData();
  formData.set("personIdent", "12345678901");
  formData.set("kategori", "DOKUMENTFALSK");
  formData.set("kilde", "NAV_KONTROLL");
  for (const [nøkkel, verdi] of Object.entries(overrides)) {
    if (verdi !== undefined) formData.set(nøkkel, verdi);
  }
  return formData;
}

describe("OpprettSakSide action", () => {
  afterEach(() => {
    vi.clearAllMocks();
    testState.skalBrukeMockdata = true;
    getBackendOboTokenMock.mockResolvedValue("token-123");
  });

  it("godtar minimal payload med kun kategori og kilde, og redirecter til ny sak", async () => {
    const { action } = await import("./RegistrerSakSide.server");
    const { opprettKontrollsak } = await import("./api.server");

    const formData = lagFormDataMedMinimum();

    const response = await action({
      request: new Request("http://localhost/registrer-sak", {
        method: "POST",
        body: formData,
      }),
      params: {},
      context: {},
    } as Route.ActionArgs);

    expect(opprettKontrollsak).toHaveBeenCalledWith({
      token: "demo",
      payload: expect.objectContaining({
        personIdent: "12345678901",
        personNavn: "Ola Testesen",
        saksbehandlere: {
          eier: null,
          deltMed: [],
        },
        kategori: "DOKUMENTFALSK",
        kilde: "NAV_KONTROLL",
        prioritet: "NORMAL",
        misbruktype: [],
        ytelser: [],
      }),
    });

    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(302);
  }, 15000);

  it("parser flere ytelse-rader fra indekserte felt", async () => {
    const { action } = await import("./RegistrerSakSide.server");
    const { opprettKontrollsak } = await import("./api.server");

    const formData = lagFormDataMedMinimum();
    formData.set("ytelser[0].type", "Dagpenger");
    formData.set("ytelser[0].fraDato", "2024-01-01");
    formData.set("ytelser[0].tilDato", "2024-06-30");
    formData.set("ytelser[0].beløp", "12000");
    formData.set("ytelser[1].type", "AAP");
    formData.set("ytelser[1].fraDato", "2024-07-01");
    formData.set("ytelser[1].tilDato", "2024-12-31");

    await action({
      request: new Request("http://localhost/registrer-sak", {
        method: "POST",
        body: formData,
      }),
      params: {},
      context: {},
    } as Route.ActionArgs);

    expect(opprettKontrollsak).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          ytelser: [
            {
              type: "Dagpenger",
              periodeFra: "2024-01-01",
              periodeTil: "2024-06-30",
              belop: 12000,
            },
            {
              type: "AAP",
              periodeFra: "2024-07-01",
              periodeTil: "2024-12-31",
              belop: undefined,
            },
          ],
        }),
      }),
    );
  }, 15000);

  it("filtrerer bort tomme ytelse-rader", async () => {
    const { action } = await import("./RegistrerSakSide.server");
    const { opprettKontrollsak } = await import("./api.server");

    const formData = lagFormDataMedMinimum();
    formData.set("ytelser[0].type", "Dagpenger");
    formData.set("ytelser[1].type", "");
    formData.set("ytelser[1].fraDato", "");

    await action({
      request: new Request("http://localhost/registrer-sak", {
        method: "POST",
        body: formData,
      }),
      params: {},
      context: {},
    } as Route.ActionArgs);

    const kall = vi.mocked(opprettKontrollsak).mock.calls[0]?.[0];
    expect(kall?.payload.ytelser).toHaveLength(1);
  }, 15000);

  it("støtter flere misbruktyper og merkinger", async () => {
    const { action } = await import("./RegistrerSakSide.server");
    const { opprettKontrollsak } = await import("./api.server");

    const formData = lagFormDataMedMinimum({ kategori: "UTLAND" });
    formData.append("misbruktype", "INNENFOR_EOS");
    formData.append("misbruktype", "UTENFOR_EOS");
    formData.append("merking", "PRIORITERT");
    formData.append("merking", "SENSITIV");

    await action({
      request: new Request("http://localhost/registrer-sak", {
        method: "POST",
        body: formData,
      }),
      params: {},
      context: {},
    } as Route.ActionArgs);

    expect(opprettKontrollsak).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          misbruktype: ["INNENFOR_EOS", "UTENFOR_EOS"],
          merking: "PRIORITERT",
        }),
      }),
    );
  }, 15000);

  it("støtter egendefinert merking", async () => {
    const { action } = await import("./RegistrerSakSide.server");
    const { opprettKontrollsak } = await import("./api.server");

    const formData = lagFormDataMedMinimum();
    formData.append("merking", "Egen merking");

    await action({
      request: new Request("http://localhost/registrer-sak", {
        method: "POST",
        body: formData,
      }),
      params: {},
      context: {},
    } as Route.ActionArgs);

    expect(opprettKontrollsak).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          merking: "Egen merking",
        }),
      }),
    );
  }, 15000);

  it("returnerer feltfeil når kategori mangler", async () => {
    const { action } = await import("./RegistrerSakSide.server");

    const formData = lagFormDataMedMinimum();
    formData.delete("kategori");

    const response = await action({
      request: new Request("http://localhost/registrer-sak", {
        method: "POST",
        body: formData,
      }),
      params: {},
      context: {},
    } as Route.ActionArgs);

    expect(response).toMatchObject({
      feil: { kategori: expect.any(Array) },
    });
  }, 15000);

  it("returnerer feltfeil når en ytelse-rad har dato frem i tid", async () => {
    const { action } = await import("./RegistrerSakSide.server");

    const iMorgen = new Date();
    iMorgen.setDate(iMorgen.getDate() + 1);
    const dato = iMorgen.toISOString().slice(0, 10);

    const formData = lagFormDataMedMinimum();
    formData.set("ytelser[0].fraDato", dato);

    const response = await action({
      request: new Request("http://localhost/registrer-sak", {
        method: "POST",
        body: formData,
      }),
      params: {},
      context: {},
    } as Route.ActionArgs);

    expect(response).toHaveProperty("feil");
  }, 15000);

  it("henter backend-token når mockdata er avslått", async () => {
    testState.skalBrukeMockdata = false;

    const { action } = await import("./RegistrerSakSide.server");

    await action({
      request: new Request("http://localhost/registrer-sak", {
        method: "POST",
        body: lagFormDataMedMinimum(),
      }),
      params: {},
      context: {},
    } as Route.ActionArgs);

    expect(getBackendOboTokenMock).toHaveBeenCalled();
  }, 15000);

  it("returnerer skjema-feil når personnavn ikke kan slås opp server-side", async () => {
    const { action } = await import("./RegistrerSakSide.server");

    const formData = lagFormDataMedMinimum({ personIdent: "99999999999" });

    const response = await action({
      request: new Request("http://localhost/registrer-sak", {
        method: "POST",
        body: formData,
      }),
      params: {},
      context: {},
    } as Route.ActionArgs);

    expect(response).toMatchObject({
      feil: { skjema: ["Fant ikke navn på personen som saken opprettes for"] },
    });
  }, 15000);
});

describe("byggOpprettKontrollsakPayload", () => {
  it("mapper skjema til backend payload", async () => {
    const { byggOpprettKontrollsakPayload } = await import("./RegistrerSakSide.server");

    expect(
      byggOpprettKontrollsakPayload({
        skjema: {
          personIdent: "12345678901",
          kategori: "SAMLIV",
          kilde: "NAV_KONTROLL",
          misbruktype: ["SKJULT_SAMLIV"],
          merking: ["PRIORITERT"],
          enhet: "ØST",
          organisasjonsnummer: "123456789",
          ytelser: [
            {
              type: "Dagpenger",
              fraDato: "2024-01-01",
              tilDato: "2024-12-31",
              beløp: 300000,
            },
          ],
        },
        personNavn: "Ola Testesen",
      }),
    ).toEqual({
      personIdent: "12345678901",
      personNavn: "Ola Testesen",
      saksbehandlere: { eier: null, deltMed: [] },
      kategori: "SAMLIV",
      kilde: "NAV_KONTROLL",
      prioritet: "NORMAL",
      misbruktype: ["SKJULT_SAMLIV"],
      merking: "PRIORITERT",
      ytelser: [
        {
          type: "Dagpenger",
          periodeFra: "2024-01-01",
          periodeTil: "2024-12-31",
          belop: 300000,
        },
      ],
    });
  });
});
