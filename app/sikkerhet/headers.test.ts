import { describe, expect, it } from "vitest";
import { sikkerhetHeaders } from "./headers";

describe("sikkerhetHeaders", () => {
  it("tillater analytics-kall til reops event proxy i connect-src", () => {
    const csp = sikkerhetHeaders()["Content-Security-Policy"];

    expect(csp).toContain(
      "connect-src 'self' telemetry.nav.no telemetry.ekstern.dev.nav.no umami.nav.no reops-event-proxy.nav.no reops-event-proxy.ekstern.dev.nav.no;",
    );
  });

  it("inkluderer kun 'self' i form-action som standard", () => {
    const csp = sikkerhetHeaders()["Content-Security-Policy"];
    expect(csp).toContain("form-action 'self'");
  });

  it("legger til ekstra form-action URL-er når angitt", () => {
    const csp = sikkerhetHeaders({
      ekstraFormActionUrls: ["https://watson-sok.intern.nav.no"],
    })["Content-Security-Policy"];
    expect(csp).toContain("form-action 'self' https://watson-sok.intern.nav.no");
  });
});
