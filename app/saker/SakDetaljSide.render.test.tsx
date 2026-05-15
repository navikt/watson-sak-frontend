import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { lagMockSakId } from "~/saker/mock-uuid";
import { resetDefaultSession } from "~/testing/mock-store/session.server";
import SakDetaljSide, { loader } from "./SakDetaljSide.route";

vi.mock("~/config/env.server", () => ({
  skalBrukeMockdata: true,
}));

vi.mock("~/auth/innlogget-bruker", () => ({
  useInnloggetBruker: () => ({
    navIdent: "Z999999",
    name: "Test Saksbehandler",
    organisasjoner: [],
  }),
}));

const testRequest = new Request("http://localhost");
const testSakId = String(lagMockSakId("201", 2));
const deltMedSakId = String(lagMockSakId("101", 1));

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

  it("viser saksbehandlere over handlinger med ansvarlig og delte brukere", async () => {
    renderDetaljside(deltMedSakId);

    const saksbehandlereHeading = await screen.findByRole("heading", { name: "Saksbehandlere" });
    const handlingerHeading = await screen.findByRole("heading", { name: "Handlinger" });

    expect(saksbehandlereHeading.compareDocumentPosition(handlingerHeading)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(screen.getByRole("heading", { name: "Delt med" })).toBeDefined();
    expect(screen.getByText("Ingen ansvarlig saksbehandler satt.")).toBeDefined();
    expect(screen.getAllByText("Kari Nordmann").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ada Larsen").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Endre ansvarlig saksbehandler" })).toBeNull();
    expect(screen.getByRole("button", { name: "Fjern deling med Kari Nordmann" })).toBeDefined();
  }, 15000);
});
