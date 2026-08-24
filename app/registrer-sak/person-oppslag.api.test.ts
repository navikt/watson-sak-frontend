import { beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({
  skalBrukeMockdata: true,
}));

const getBackendOboTokenMock = vi.hoisted(() => vi.fn().mockResolvedValue("token-123"));
const slåOppPersonMock = vi.hoisted(() => vi.fn());
const søkKontrollsakerMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ items: [], totalCount: 0 }),
);
const slaOppPersonMockServerMock = vi.hoisted(() => vi.fn());

vi.mock("~/config/env.server", () => ({
  get skalBrukeMockdata() {
    return testState.skalBrukeMockdata;
  },
}));

vi.mock("~/auth/access-token", () => ({
  getBackendOboToken: getBackendOboTokenMock,
}));

vi.mock("~/saker/api.server", () => ({
  slåOppPerson: slåOppPersonMock,
  søkKontrollsaker: søkKontrollsakerMock,
}));

vi.mock("./person-oppslag.mock.server", () => ({
  slaOppPerson: slaOppPersonMockServerMock,
}));

function lagRequest(fnr: string) {
  const formData = new FormData();
  formData.set("fnr", fnr);
  return new Request("http://localhost/api/registrer-sak/person-oppslag", {
    method: "POST",
    body: formData,
  });
}

async function runAction(fnr: string) {
  const { action } = await import("./person-oppslag.api");
  const request = lagRequest(fnr);
  return action({ request });
}

describe("person-oppslag action", () => {
  beforeEach(() => {
    testState.skalBrukeMockdata = true;
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("mot ekte backend", () => {
    beforeEach(() => {
      testState.skalBrukeMockdata = false;
    });

    it("markerer søktMedHistoriskIdent=false når søkt ident er gjeldende ident", async () => {
      slåOppPersonMock.mockResolvedValue({
        type: "success",
        person: {
          navn: "Ola Testesen",
          personIdent: "12345678901",
          alder: 30,
          adresseskjermet: false,
        },
      });

      const response = await runAction("12345678901");
      const json = await response.json();

      expect(json.søktMedHistoriskIdent).toBe(false);
    });

    it("markerer søktMedHistoriskIdent=true når backend resolver til en annen (gjeldende) ident", async () => {
      slåOppPersonMock.mockResolvedValue({
        type: "success",
        person: {
          navn: "Ola Testesen",
          personIdent: "12345678901",
          alder: 30,
          adresseskjermet: false,
        },
      });

      const response = await runAction("10987654321");
      const json = await response.json();

      expect(json.søktMedHistoriskIdent).toBe(true);
      // Personen som vises/opprettes saken på skal likevel være gjeldende ident.
      expect(json.person.personnummer.replace(/\s/g, "")).toBe("12345678901");
    });

    it("søker etter eksisterende saker på gjeldende ident, ikke søkestrengen", async () => {
      slåOppPersonMock.mockResolvedValue({
        type: "success",
        person: {
          navn: "Ola Testesen",
          personIdent: "12345678901",
          alder: 30,
          adresseskjermet: false,
        },
      });

      await runAction("10987654321");

      expect(søkKontrollsakerMock).toHaveBeenCalledWith("token-123", "12345678901", 1, 100);
    });
  });

  describe("mot mockdata", () => {
    it("forwarder søktMedHistoriskIdent fra mock-laget uendret", async () => {
      slaOppPersonMockServerMock.mockReturnValue({
        person: { navn: "Ola Testesen", personnummer: "12345678901", aktørId: "", alder: 30 },
        eksisterendeSaker: [],
        søktMedHistoriskIdent: true,
      });

      const response = await runAction("10987654321");
      const json = await response.json();

      expect(json.søktMedHistoriskIdent).toBe(true);
    });
  });
});
