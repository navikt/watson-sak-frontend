import { describe, expect, it } from "vitest";
import { hentTekniskFeilId } from "./lagringsfeil";

const svar = (body: unknown) =>
  new Response(typeof body === "string" ? body : JSON.stringify(body), { status: 500 });

describe("hentTekniskFeilId", () => {
  it("gir feil-ID ved teknisk feil", async () => {
    await expect(
      hentTekniskFeilId(svar({ ok: false, teknisk: true, feilId: "a1b2c3d4" })),
    ).resolves.toBe("a1b2c3d4");
  });

  it("gir undefined ved annen feil eller ugyldig JSON", async () => {
    await expect(hentTekniskFeilId(svar({ ok: false, feil: "Konflikt" }))).resolves.toBeUndefined();
    await expect(hentTekniskFeilId(svar("<html>"))).resolves.toBeUndefined();
  });
});
