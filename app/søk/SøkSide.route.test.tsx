import { describe, expect, it, vi } from "vitest";
import { action } from "./SøkSide.route";
import { søkSaker } from "./søk.server";

vi.mock("./søk.server", () => ({ søkSaker: vi.fn() }));

describe("SøkSide action", () => {
  it("returnerer teknisk feil og beholder søketeksten ved søkefeil", async () => {
    vi.mocked(søkSaker).mockRejectedValue(new Error("Teknisk feil"));
    const formData = new FormData();
    formData.set("søketekst", "1028");
    const request = new Request("http://localhost/søk", { method: "POST", body: formData });

    const svar = await action({ request } as Parameters<typeof action>[0]);

    expect(svar).toMatchObject({
      init: { status: 500 },
      data: {
        teknisk: true,
        søketekst: "1028",
        feilId: expect.stringMatching(/^[a-f0-9]{8}$/),
      },
    });
  });
});
