import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDefaultSession } from "~/testing/mock-store/session.server";
import SakDetaljSide, { loader } from "./SakDetaljSide.route";

vi.mock("~/config/env.server", () => ({
  skalBrukeMockdata: true,
  env: { ENVIRONMENT: "local-mock" },
}));

vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: async () => ({
    navIdent: "Z999999",
    name: "Test Saksbehandler",
    preferredUsername: "test@nav.no",
    enhet: "4812",
  }),
}));

vi.mock("~/auth/innlogget-bruker", () => ({
  useInnloggetBruker: () => ({
    navIdent: "Z999999",
    name: "Test Saksbehandler",
    enhet: "4812",
  }),
}));

const testRequest = new Request("http://localhost");
const testSakId = "201";
const deltMedSakId = "101";

function renderDetaljside(sakId = testSakId) {
  const router = createMemoryRouter(
    [
      {
        path: "/saker/:sakId",
        loader: ({ params }) =>
          loader({ request: testRequest, params: { sakId: params.sakId ?? sakId } } as never),
        Component: SakDetaljSide,
      },
    ],
    {
      initialEntries: [`/saker/${sakId}`],
    },
  );

  return render(<RouterProvider router={router} />);
}

describe("SakDetaljSide render", () => {
  beforeEach(() => {
    resetDefaultSession();
  });

  it("viser lagre og avbryt i redigeringsmodus", async () => {
    renderDetaljside();

    fireEvent.click(await screen.findByRole("button", { name: "Rediger saksinformasjon" }));

    expect(await screen.findByRole("button", { name: "Lagre" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Avbryt" })).toBeDefined();
    expect(screen.getByLabelText("Kategori")).toBeDefined();
  }, 15000);

  it("viser misbruktype når kategori byttes til en kategori med misbrukstyper", async () => {
    renderDetaljside();

    fireEvent.click(await screen.findByRole("button", { name: "Rediger saksinformasjon" }));
    fireEvent.change(await screen.findByLabelText("Kategori"), {
      target: { value: "ARBEID" },
    });

    expect(await screen.findByLabelText("Misbruktype")).toBeDefined();
  }, 15000);

  it("viser saksbehandlere med delte brukere, men skjuler handlinger og fjern-knapper for ikke-eier", async () => {
    renderDetaljside(deltMedSakId);

    const saksbehandlereHeading = await screen.findByRole("heading", { name: "Saksbehandlere" });

    expect(saksbehandlereHeading).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Handlinger" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Delt med" })).toBeDefined();
    expect(screen.getByText("Ingen ansvarlig saksbehandler satt.")).toBeDefined();
    expect(screen.getAllByText("Kari Nordmann").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ada Larsen").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Endre ansvarlig saksbehandler" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Fjern deling med Kari Nordmann" })).toBeNull();
  }, 15000);

  it("viser organisasjonsnummer i read-only-visning når det er satt", async () => {
    const { hentMockState } = await import("~/testing/mock-store/session.server");
    const { hentAlleSaker } = await import("~/testing/mock-store/alle-saker.server");
    const saker = hentAlleSaker(hentMockState(testRequest));
    const sak = saker.find((s) => s.id === Number(deltMedSakId));
    if (sak) sak.organisasjonsnummer = "987654321";

    renderDetaljside(deltMedSakId);

    expect(await screen.findByText("987 654 321")).toBeDefined();
    expect(screen.getByText("Organisasjonsnummer")).toBeDefined();
  }, 15000);

  it("skjuler organisasjonsnummer-felt i read-only når det er null", async () => {
    renderDetaljside();

    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByText("Organisasjonsnummer")).toBeNull();
  }, 15000);

  it("viser organisasjonsnummer-felt i redigeringsmodus", async () => {
    renderDetaljside();

    fireEvent.click(await screen.findByRole("button", { name: "Rediger saksinformasjon" }));

    expect(await screen.findByLabelText("Organisasjonsnummer (valgfritt)")).toBeDefined();
  }, 15000);
});
