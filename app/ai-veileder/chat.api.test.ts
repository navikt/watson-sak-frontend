import { describe, expect, it, vi } from "vitest";

const hentAlleFeatureFlaggMock = vi.hoisted(() => vi.fn());
const sendChatMeldingMock = vi.hoisted(() => vi.fn());

vi.mock("~/config/env.server", () => ({
  skalBrukeMockdata: false,
}));

vi.mock("~/auth/access-token", () => ({
  getBackendOboToken: () => Promise.resolve("token-123"),
}));

vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: () =>
    Promise.resolve({
      preferredUsername: "test",
      name: "Saks Behandlersen",
      navIdent: "Z999999",
      enhet: "4812",
    }),
}));

vi.mock("~/feature-toggling/utils.server", () => ({
  hentAlleFeatureFlagg: hentAlleFeatureFlaggMock,
}));

vi.mock("./api.server", () => ({
  sendChatMelding: sendChatMeldingMock,
  ChatRateLimitFeil: class ChatRateLimitFeil extends Error {},
}));

async function kjørAction(melding: string) {
  const { action } = await import("./chat.api");
  const formData = new FormData();
  formData.set("melding", melding);
  const request = new Request("http://localhost/api/ai-veileder/melding", {
    method: "POST",
    body: formData,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return action({ request, params: {}, context: {} } as any);
}

describe("ai-veileder chat.api action", () => {
  it("kaster 404 når feature-flagget er avskrudd", async () => {
    hentAlleFeatureFlaggMock.mockResolvedValueOnce({ "watson-sak-ai-veileder": false });

    await expect(kjørAction("hei")).rejects.toMatchObject({ init: { status: 404 } });
    expect(sendChatMeldingMock).not.toHaveBeenCalled();
  });

  it("videresender melding til backend og returnerer svaret", async () => {
    hentAlleFeatureFlaggMock.mockResolvedValueOnce({ "watson-sak-ai-veileder": true });
    sendChatMeldingMock.mockResolvedValueOnce({
      reply: "Trykk på Mine saker.",
      timestamp: "2026-01-01T10:00:00Z",
      escalateSuggested: false,
      guard: "ALLOWED",
    });

    const respons = await kjørAction("Hvor er mine saker?");
    const json = await (respons as Response).json();

    expect(sendChatMeldingMock).toHaveBeenCalledWith("token-123", "Hvor er mine saker?");
    expect(json.data.reply).toBe("Trykk på Mine saker.");
  });

  it("returnerer 429 når backend rate-limiter", async () => {
    hentAlleFeatureFlaggMock.mockResolvedValueOnce({ "watson-sak-ai-veileder": true });
    const { ChatRateLimitFeil } = await import("./api.server");
    sendChatMeldingMock.mockRejectedValueOnce(new ChatRateLimitFeil("for mange"));

    const respons = (await kjørAction("hei")) as Response;

    expect(respons.status).toBe(429);
  });

  it("returnerer 502 ved uventet feil fra backend", async () => {
    hentAlleFeatureFlaggMock.mockResolvedValueOnce({ "watson-sak-ai-veileder": true });
    sendChatMeldingMock.mockRejectedValueOnce(new Error("noe gikk galt"));

    const respons = (await kjørAction("hei")) as Response;

    expect(respons.status).toBe(502);
  });
});
