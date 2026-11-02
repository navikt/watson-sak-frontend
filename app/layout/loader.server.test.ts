import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  hentAlleFeatureFlagg,
  hentStatusmeldingFeatureFlagg,
} from "~/feature-toggling/utils.server";
import { logger } from "~/logging/logging";
import { rootLoader } from "./loader.server";

vi.mock("~/config/env.server", () => ({
  env: { ENVIRONMENT: "dev", FARO_URL: "", UMAMI_SITE_ID: "", APP_VERSION: "1" },
  isProd: false,
  skalBrukeMockdata: true,
  SPORING_SCRIPT_URL: "",
}));
vi.mock("~/logging/logging", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));
vi.mock("~/auth/access-token", () => ({ getBackendOboToken: vi.fn() }));
vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: vi.fn().mockResolvedValue({ navIdent: "Z999999" }),
}));
vi.mock("~/feature-toggling/utils.server", () => ({
  hentAlleFeatureFlagg: vi.fn(),
  hentStatusmeldingFeatureFlagg: vi.fn(),
}));
vi.mock("~/testing/mock-store/kodeverk.server", () => ({ mockKodeverk: {} }));

const args = () =>
  ({ request: new Request("https://watson.example/"), params: {}, context: {} }) as Parameters<
    typeof rootLoader
  >[0];

describe("rootLoader uten Unleash", () => {
  beforeEach(() => vi.clearAllMocks());

  it("slår av alle flagg og statusmelding i stedet for å vise feilside", async () => {
    vi.mocked(hentAlleFeatureFlagg).mockRejectedValue(new Error("Unleash svarer ikke"));
    vi.mocked(hentStatusmeldingFeatureFlagg).mockRejectedValue(new Error("Unleash svarer ikke"));

    const resultat = await rootLoader(args());

    expect(Object.values(resultat.featureFlagg).every((verdi) => verdi === false)).toBe(true);
    expect(resultat.statusmelding).toBe(false);
    expect(logger.error).toHaveBeenCalledWith(
      "Teknisk feil: hente feature-flagg",
      expect.objectContaining({ feilId: expect.stringMatching(/^[0-9a-f]{8}$/) }),
    );
  });
});
