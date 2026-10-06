import { describe, expect, it, vi } from "vitest";

vi.mock("~/config/env.server", () => ({
  env: { IDENT_SESSION_SECRET: "test-secret" },
}));

import { action } from "./forhåndsutfyll.api";
import { pendingFnrCookie } from "./pending-fnr.server";

describe("forhåndsutfyll.api", () => {
  it("lagrer fnr i cookie og omdirigerer", async () => {
    const formData = new FormData();
    formData.set("fnr", "12345678901");

    const request = new Request("http://localhost/api/registrer-sak/forhåndsutfyll", {
      method: "POST",
      body: formData,
    });

    const response = await action({ request });
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/registrer-sak");

    const setCookie = response.headers.get("Set-Cookie");
    expect(setCookie).not.toBeNull();
    const parsed = await pendingFnrCookie.parse(setCookie);
    expect(parsed).toEqual(
      expect.objectContaining({
        fnr: "12345678901",
      }),
    );
  });

  it("støtter legacyPid og legacyKilde fra migrering", async () => {
    const formData = new FormData();
    formData.set("fnr", "12345678901");
    formData.set("legacyPid", "100245");
    formData.set("legacyKilde", "UTREDNING");

    const request = new Request("http://localhost/api/registrer-sak/forhåndsutfyll", {
      method: "POST",
      body: formData,
    });

    const response = await action({ request });
    expect(response.status).toBe(302);

    const setCookie = response.headers.get("Set-Cookie");
    const parsed = await pendingFnrCookie.parse(setCookie);
    expect(parsed).toEqual({
      fnr: "12345678901",
      legacyPid: "100245",
      legacyKilde: "UTREDNING",
    });
  });

  it("avviser ugyldig fnr og setter ikke data når legacyPid/legacyKilde også mangler", async () => {
    const formData = new FormData();
    formData.set("fnr", "ugyldig-fnr");

    const request = new Request("http://localhost/api/registrer-sak/forhåndsutfyll", {
      method: "POST",
      body: formData,
    });

    const response = await action({ request });
    expect(response.status).toBe(302);
    expect(response.headers.get("Set-Cookie")).toBeNull();
  });

  it("setter kun legacyPid/legacyKilde når fnr ikke er kjent (migreringslisten eksponerer aldri fnr)", async () => {
    const formData = new FormData();
    formData.set("legacyPid", "100245");
    formData.set("legacyKilde", "UTREDNING");

    const request = new Request("http://localhost/api/registrer-sak/forhåndsutfyll", {
      method: "POST",
      body: formData,
    });

    const response = await action({ request });
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/registrer-sak");

    const setCookie = response.headers.get("Set-Cookie");
    expect(setCookie).not.toBeNull();
    const parsed = await pendingFnrCookie.parse(setCookie);
    expect(parsed).toEqual({
      legacyPid: "100245",
      legacyKilde: "UTREDNING",
    });
  });

  it("ignorerer legacyKilde med ugyldig verdi", async () => {
    const formData = new FormData();
    formData.set("legacyPid", "100245");
    formData.set("legacyKilde", "NOE_UKJENT");

    const request = new Request("http://localhost/api/registrer-sak/forhåndsutfyll", {
      method: "POST",
      body: formData,
    });

    const response = await action({ request });
    expect(response.status).toBe(302);
    expect(response.headers.get("Set-Cookie")).toBeNull();
  });
});
