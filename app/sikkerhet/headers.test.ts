import { describe, expect, it } from "vitest";
import { sikkerhetHeaders } from "./headers";

describe("sikkerhetHeaders", () => {
  it("tillater analytics-kall til reops event proxy i connect-src", () => {
    const csp = sikkerhetHeaders()["Content-Security-Policy"];

    expect(csp).toContain(
      "connect-src 'self' telemetry.nav.no telemetry.ekstern.dev.nav.no umami.nav.no reops-event-proxy.nav.no;",
    );
  });
});
