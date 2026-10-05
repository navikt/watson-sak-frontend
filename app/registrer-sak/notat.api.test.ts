import { data } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

const lagreNotatFraOpprettelseMock = vi.fn().mockResolvedValue(undefined);
const kreverEgenMigreringssakMock = vi.fn().mockResolvedValue(undefined);
vi.mock("./notat-fra-opprettelse.server", () => ({
  lagreNotatFraOpprettelse: lagreNotatFraOpprettelseMock,
  kreverEgenMigreringssak: kreverEgenMigreringssakMock,
}));

function lagRequest(body?: FormData) {
  return new Request("http://localhost/api/registrer-sak/notat", {
    method: "POST",
    body,
  });
}

describe("notat.api action", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lagrer notatet på nytt og returnerer ok", async () => {
    const { action } = await import("./notat.api");
    const formData = new FormData();
    formData.set("sakId", "42");
    formData.set("notat", "Internt notat om saken.");

    const response = await action({
      request: lagRequest(formData),
      params: {},
      context: {},
    } as never);

    expect(lagreNotatFraOpprettelseMock).toHaveBeenCalledWith(
      expect.any(Request),
      "42",
      "Internt notat om saken.",
      { gjenbrukEksisterende: true },
    );
    expect(kreverEgenMigreringssakMock).toHaveBeenCalledWith(expect.any(Request), "42");
    expect(response).toEqual({ ok: true });
  });

  it("lagrer ikke noe når saken ikke er innlogget brukers migreringssak", async () => {
    kreverEgenMigreringssakMock.mockRejectedValueOnce(data("Ingen tilgang", { status: 403 }));
    const { action } = await import("./notat.api");
    const formData = new FormData();
    formData.set("sakId", "42");
    formData.set("notat", "Internt notat om saken.");

    await expect(
      action({ request: lagRequest(formData), params: {}, context: {} } as never),
    ).rejects.toMatchObject({ init: { status: 403 } });
    expect(lagreNotatFraOpprettelseMock).not.toHaveBeenCalled();
  });

  it("avviser notat over 4000 tegn, som sakskjemaet", async () => {
    const { action } = await import("./notat.api");
    const formData = new FormData();
    formData.set("sakId", "42");
    formData.set("notat", "x".repeat(4001));

    await expect(
      action({ request: lagRequest(formData), params: {}, context: {} } as never),
    ).rejects.toMatchObject({ init: { status: 400 } });
    expect(lagreNotatFraOpprettelseMock).not.toHaveBeenCalled();
  });

  it("godtar notat på nøyaktig 4000 tegn", async () => {
    const { action } = await import("./notat.api");
    const formData = new FormData();
    formData.set("sakId", "42");
    formData.set("notat", "x".repeat(4000));

    expect(
      await action({ request: lagRequest(formData), params: {}, context: {} } as never),
    ).toEqual({ ok: true });
  });

  it("bevarer 401 når sesjonen er utløpt, i stedet for å svare 502", async () => {
    lagreNotatFraOpprettelseMock.mockRejectedValueOnce(data("Utløpt", { status: 401 }));
    const { action } = await import("./notat.api");
    const formData = new FormData();
    formData.set("sakId", "42");
    formData.set("notat", "Internt notat om saken.");

    await expect(
      action({ request: lagRequest(formData), params: {}, context: {} } as never),
    ).rejects.toMatchObject({ init: { status: 401 } });
  });

  it("svarer 502 uten å kaste når lagringen feiler", async () => {
    lagreNotatFraOpprettelseMock.mockRejectedValueOnce(new Error("nettverksfeil"));
    const { action } = await import("./notat.api");
    const formData = new FormData();
    formData.set("sakId", "42");
    formData.set("notat", "Internt notat om saken.");

    const response = (await action({
      request: lagRequest(formData),
      params: {},
      context: {},
    } as never)) as unknown as { init?: { status?: number } };

    expect(response.init?.status).toBe(502);
  });

  it("krever sakId", async () => {
    const { action } = await import("./notat.api");
    const formData = new FormData();
    formData.set("notat", "Internt notat om saken.");

    await expect(
      action({ request: lagRequest(formData), params: {}, context: {} } as never),
    ).rejects.toMatchObject({ init: { status: 400 } });
  });

  it("krever ikke-tom notattekst", async () => {
    const { action } = await import("./notat.api");
    const formData = new FormData();
    formData.set("sakId", "42");
    formData.set("notat", "   ");

    await expect(
      action({ request: lagRequest(formData), params: {}, context: {} } as never),
    ).rejects.toMatchObject({ init: { status: 400 } });
  });

  it("avviser andre metoder enn POST", async () => {
    const { action } = await import("./notat.api");

    await expect(
      action({
        request: new Request("http://localhost/api/registrer-sak/notat", { method: "GET" }),
        params: {},
        context: {},
      } as never),
    ).rejects.toMatchObject({ init: { status: 405 } });
  });
});
