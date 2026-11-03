import { afterEach, describe, expect, it, vi } from "vitest";
import type { Route } from "./+types/RegistrerSakSide.route";

const testState = vi.hoisted(() => ({
  skalBrukeMockdata: true,
}));

const getBackendOboTokenMock = vi.fn().mockResolvedValue("token-123");

vi.mock("./api.server", () => ({
  opprettKontrollsak: vi
    .fn()
    .mockResolvedValue({ ok: true, sak: { id: "00000000-0000-4000-8000-000000301000" } }),
  lastOppFil: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("~/saker/api.server", () => ({
  slåOppPerson: vi.fn().mockResolvedValue({
    type: "success",
    person: { navn: "Ola Testesen", personIdent: "12345678901", alder: 30 },
  }),
}));

vi.mock("~/auth/access-token", () => ({
  getBackendOboToken: getBackendOboTokenMock,
}));

vi.mock("~/config/env.server", () => ({
  get skalBrukeMockdata() {
    return testState.skalBrukeMockdata;
  },
  env: { IDENT_SESSION_SECRET: "test-secret" },
}));

vi.mock("./person-oppslag.mock.server", () => ({
  slaOppPerson: vi.fn((_request: Request, fnr: string) =>
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
  formData.set("enhet", "ky153k");
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

  it("godtar minimal payload med påkrevde felter og returnerer saksnummer", async () => {
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

    expect(opprettKontrollsak).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "demo",
        payload: expect.objectContaining({
          personIdent: "12345678901",
          saksbehandlere: {
            eier: null,
            deltMed: [],
          },
          kategori: "DOKUMENTFALSK",
          kilde: "NAV_KONTROLL",
          enhet: "ky153k",
          prioritet: "NORMAL",
          misbruktype: [],
          ytelser: [],
        }),
      }),
    );

    expect(response).toMatchObject({
      data: { ok: true, sakId: "00000000-0000-4000-8000-000000301000" },
    });
  }, 15000);

  it("merker filer lastet opp ved saksopprettelse i mockmodus", async () => {
    const { action } = await import("./RegistrerSakSide.server");
    const { lastOppFil } = await import("./api.server");
    const filer = [
      new File(["første"], "første.pdf", { type: "application/pdf" }),
      new File(["andre"], "andre.pdf", { type: "application/pdf" }),
    ];
    const formData = lagFormDataMedMinimum();
    filer.forEach((fil) => formData.append("filer", fil));
    const request = new Request("http://localhost/registrer-sak", {
      method: "POST",
      body: formData,
    });
    vi.spyOn(request, "formData").mockResolvedValue(formData);

    const response = await action({ request, params: {}, context: {} } as Route.ActionArgs);

    expect(response).toMatchObject({
      data: { ok: true, sakId: "00000000-0000-4000-8000-000000301000" },
    });

    expect(lastOppFil).toHaveBeenNthCalledWith(
      1,
      request,
      "demo",
      "00000000-0000-4000-8000-000000301000",
      filer[0],
      true,
    );
    expect(lastOppFil).toHaveBeenNthCalledWith(
      2,
      request,
      "demo",
      "00000000-0000-4000-8000-000000301000",
      filer[1],
      true,
    );
  }, 15000);

  it("sender notat bare sammen med migreringsnøkkel i opprett-kallet", async () => {
    const { action } = await import("./RegistrerSakSide.server");
    const { opprettKontrollsak } = await import("./api.server");
    const args = (data: FormData) =>
      ({
        request: new Request("http://localhost/registrer-sak", { method: "POST", body: data }),
        params: {},
        context: {},
      }) as Route.ActionArgs;

    await action(args(lagFormDataMedMinimum({ notat: "Notat uten migrering" })));
    expect(opprettKontrollsak).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.not.objectContaining({ notat: expect.any(String) }),
      }),
    );

    await action(
      args(
        lagFormDataMedMinimum({
          legacyPid: "100245",
          legacyKilde: "UTREDNING",
          notat: "Internt notat om saken.",
        }),
      ),
    );
    expect(opprettKontrollsak).toHaveBeenLastCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({ notat: "Internt notat om saken." }),
      }),
    );
  }, 15000);

  it("viser ikke suksess når backend ikke fikk lagret notatet", async () => {
    const { action } = await import("./RegistrerSakSide.server");
    const { opprettKontrollsak } = await import("./api.server");
    vi.mocked(opprettKontrollsak).mockResolvedValueOnce({
      ok: false,
      status: 500,
      melding: "Kunne ikke opprette kontrollsak.",
    });

    const svar = await action({
      request: new Request("http://localhost/registrer-sak", {
        method: "POST",
        body: lagFormDataMedMinimum({
          legacyPid: "100245",
          legacyKilde: "UTREDNING",
          notat: "Notat",
        }),
      }),
      params: {},
      context: {},
    } as Route.ActionArgs);

    // Teknisk feil vises ved skjemaet, ikke som suksess eller feilside.
    expect(svar).toMatchObject({
      data: { ok: false, teknisk: true, feilId: expect.stringMatching(/^[0-9a-f]{8}$/) },
      init: { status: 500 },
    });
    expect(JSON.stringify(svar)).not.toContain("Notat");
  }, 15000);

  it("returnerer teknisk feil ved backend-feil uten å sende skjemadata tilbake", async () => {
    const { action } = await import("./RegistrerSakSide.server");
    const { opprettKontrollsak } = await import("./api.server");
    const { BackendFeilException } = await import("~/saker/api-core.server");
    const formData = lagFormDataMedMinimum({
      legacyPid: "100245",
      legacyKilde: "UTREDNING",
      notat: "IKKE-SEND-DENNE-FORMVERDIEN",
    });
    vi.mocked(opprettKontrollsak).mockRejectedValueOnce(new BackendFeilException(500, "Feil"));

    const response = await action({
      request: new Request("http://localhost/registrer-sak", { method: "POST", body: formData }),
      params: {},
      context: {},
    } as Route.ActionArgs);

    expect(response).toMatchObject({
      init: { status: 500 },
      data: { ok: false, teknisk: true, feilId: expect.stringMatching(/^[0-9a-f]{8}$/) },
    });
    expect(JSON.stringify(response)).not.toContain("IKKE-SEND-DENNE-FORMVERDIEN");
    expect(JSON.stringify(response)).not.toContain("100245");
  }, 15000);

  it("parser flere ytelse-rader fra indekserte felt", async () => {
    const { action } = await import("./RegistrerSakSide.server");
    const { opprettKontrollsak } = await import("./api.server");

    const formData = lagFormDataMedMinimum();
    formData.set("ytelser[0].type", "DAGPENGER");
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
              type: "DAGPENGER",
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
    formData.set("ytelser[0].type", "DAGPENGER");
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
    formData.append("merking", "LIME");
    formData.append("merking", "REGMAN");

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
          merking: ["LIME", "REGMAN"],
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
          merking: ["Egen merking"],
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
      status: "error",
      error: { kategori: expect.any(Array) },
    });
  }, 15000);

  it("returnerer feltfeil når enhet mangler", async () => {
    const { action } = await import("./RegistrerSakSide.server");

    const formData = lagFormDataMedMinimum();
    formData.delete("enhet");

    const response = await action({
      request: new Request("http://localhost/registrer-sak", {
        method: "POST",
        body: formData,
      }),
      params: {},
      context: {},
    } as Route.ActionArgs);

    expect(response).toMatchObject({
      status: "error",
      error: { enhet: ["Velg enhet"] },
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

    expect(response).toHaveProperty("status", "error");
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
  it("returnerer skjemafeil når backend svarer 404 (person ikke funnet)", async () => {
    const { action } = await import("./RegistrerSakSide.server");
    const { opprettKontrollsak } = await import("./api.server");

    vi.mocked(opprettKontrollsak).mockResolvedValueOnce({
      ok: false,
      status: 404,
      melding: "Person ikke funnet.",
    });

    const response = await action({
      request: new Request("http://localhost/registrer-sak", {
        method: "POST",
        body: lagFormDataMedMinimum(),
      }),
      params: {},
      context: {},
    } as Route.ActionArgs);

    expect(response).toMatchObject({
      status: "error",
      error: { "": expect.arrayContaining([expect.stringContaining("ikke funnet")]) },
    });
  }, 15000);

  it("returnerer skjemafeil når backend svarer 403 (ingen tilgang til å opprette sak)", async () => {
    const { action } = await import("./RegistrerSakSide.server");
    const { opprettKontrollsak } = await import("./api.server");

    vi.mocked(opprettKontrollsak).mockResolvedValueOnce({
      ok: false,
      status: 403,
      melding: "Ingen tilgang til å opprette kontrollsak.",
    });

    const response = await action({
      request: new Request("http://localhost/registrer-sak", {
        method: "POST",
        body: lagFormDataMedMinimum(),
      }),
      params: {},
      context: {},
    } as Route.ActionArgs);

    expect(response).toMatchObject({
      status: "error",
      error: {
        "": expect.arrayContaining([
          expect.stringContaining("Du har ikke tilgang til å opprette sak på denne personen"),
        ]),
      },
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
          merking: ["LIME"],
          enhet: "ky153k",
          arbeidsgivere: ["123456789"],
          ytelser: [
            {
              type: "DAGPENGER",
              fraDato: "2024-01-01",
              tilDato: "2024-12-31",
              beløp: 300000,
            },
          ],
        },
      }),
    ).toEqual({
      personIdent: "12345678901",
      saksbehandlere: { eier: null, deltMed: [] },
      kategori: "SAMLIV",
      kilde: "NAV_KONTROLL",
      prioritet: "NORMAL",
      misbruktype: ["SKJULT_SAMLIV"],
      merking: ["LIME"],
      enhet: "ky153k",
      arbeidsgivere: ["123456789"],
      ytelser: [
        {
          type: "DAGPENGER",
          periodeFra: "2024-01-01",
          periodeTil: "2024-12-31",
          belop: 300000,
        },
      ],
    });
  });

  it("tar med legacyPid/legacyKilde når begge er satt på skjemaet", async () => {
    const { byggOpprettKontrollsakPayload } = await import("./RegistrerSakSide.server");

    const payload = byggOpprettKontrollsakPayload({
      skjema: {
        personIdent: "12345678901",
        kategori: "SAMLIV",
        kilde: "NAV_KONTROLL",
        misbruktype: [],
        merking: [],
        enhet: "ky153k",
        arbeidsgivere: [],
        ytelser: [],
        legacyPid: "100245",
        legacyKilde: "UTREDNING",
      },
    });

    expect(payload).toMatchObject({ legacyPid: "100245", legacyKilde: "UTREDNING" });
  });

  it("utelater legacyPid/legacyKilde når de mangler på skjemaet", async () => {
    const { byggOpprettKontrollsakPayload } = await import("./RegistrerSakSide.server");

    const payload = byggOpprettKontrollsakPayload({
      skjema: {
        personIdent: "12345678901",
        kategori: "SAMLIV",
        kilde: "NAV_KONTROLL",
        misbruktype: [],
        merking: [],
        enhet: "ky153k",
        arbeidsgivere: [],
        ytelser: [],
      },
    });

    expect(payload).not.toHaveProperty("legacyPid");
    expect(payload).not.toHaveProperty("legacyKilde");
  });
});

describe("OpprettSakSide action — allerede migrert (409)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returnerer skjemafeil med kontrollsakId når backend svarer 409", async () => {
    vi.resetModules();
    vi.doMock("./api.server", () => ({
      opprettKontrollsak: vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        melding: "Kandidaten er allerede overført til en kontrollsak.",
        kontrollsakId: 77,
      }),
    }));
    vi.doMock("~/saker/api.server", () => ({
      slåOppPerson: vi.fn().mockResolvedValue({
        type: "success",
        person: { navn: "Ola Testesen", personIdent: "12345678901", alder: 30 },
      }),
    }));
    vi.doMock("~/auth/access-token", () => ({
      getBackendOboToken: vi.fn().mockResolvedValue("token-123"),
    }));
    vi.doMock("~/config/env.server", () => ({
      skalBrukeMockdata: false,
      env: { IDENT_SESSION_SECRET: "test-secret" },
    }));

    const { action } = await import("./RegistrerSakSide.server");

    const formData = new FormData();
    formData.set("personIdent", "12345678901");
    formData.set("kategori", "SAMLIV");
    formData.set("kilde", "NAV_KONTROLL");
    formData.set("enhet", "ky153k");
    formData.set("legacyPid", "100245");
    formData.set("legacyKilde", "UTREDNING");

    const request = new Request("http://localhost/registrer-sak", {
      method: "POST",
      body: formData,
    });

    const result = (await action({ request, params: {}, context: {} } as never)) as {
      error?: { formErrors?: string[] };
    };

    expect(JSON.stringify(result)).toContain("77");
  });
});
