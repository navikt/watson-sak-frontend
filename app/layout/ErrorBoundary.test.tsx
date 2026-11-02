import { beforeEach, describe, expect, it, vi } from "vitest";

const { loggerError } = vi.hoisted(() => ({ loggerError: vi.fn() }));

vi.mock("~/logging/logging", () => ({ logger: { error: loggerError, warn: vi.fn() } }));

import { RootErrorBoundary } from "./ErrorBoundary";

describe("RootErrorBoundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logger ikke feilmeldingen", () => {
    const personnummer = "12345678901";
    RootErrorBoundary({ error: new Error(personnummer) } as never);

    expect(loggerError).toHaveBeenCalledWith("Feil fanget av error boundary", {
      feiltype: "Error",
      status: undefined,
    });
    expect(JSON.stringify(loggerError.mock.calls)).not.toContain(personnummer);
  });
});
