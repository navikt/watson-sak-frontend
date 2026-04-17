import { beforeEach, describe, expect, it, vi } from "vitest";

const testState = vi.hoisted(() => ({
  environment: "demo",
  isDev: false,
  cluster: "dev-gcp",
}));

const requestOboTokenMock = vi.hoisted(() => vi.fn());

vi.mock("@navikt/oasis", () => ({
  getToken: vi.fn(),
  requestOboToken: requestOboTokenMock,
  validateToken: vi.fn(),
}));

vi.mock("~/config/env.server", () => ({
  env: {
    get ENVIRONMENT() {
      return testState.environment;
    },
    get CLUSTER() {
      return testState.cluster;
    },
  },
  get isDev() {
    return testState.isDev;
  },
}));

vi.mock("~/logging/logging", () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe("getBackendOboToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.environment = "demo";
    testState.isDev = false;
  });

  it("returnerer demo-placeholder uten å kalle OBO-flyten i demo", async () => {
    const { getBackendOboToken } = await import("./access-token");

    const token = await getBackendOboToken(new Request("http://localhost"));

    expect(token).toBe("demo");
    expect(requestOboTokenMock).not.toHaveBeenCalled();
  });
});
