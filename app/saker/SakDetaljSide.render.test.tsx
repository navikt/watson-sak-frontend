import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockKontrollsaker, resetMockSaker } from "~/fordeling/mock-data.server";
import { resetMockMineSaker } from "~/mine-saker/mock-data.server";
import { resetHistorikk } from "./historikk/mock-data.server";
import SakDetaljSide, { loader } from "./SakDetaljSide.route";

vi.mock("~/auth/innlogget-bruker", () => ({
  useInnloggetBruker: () => ({
    navIdent: "Z999999",
    name: "Test Saksbehandler",
    organisasjoner: [],
  }),
}));

function renderDetaljside() {
  const router = createMemoryRouter(
    [
      {
        path: "/saker/:sakId",
        loader: ({ params }) => loader({ params: { sakId: params.sakId ?? "101" } } as never),
        Component: SakDetaljSide,
      },
    ],
    {
      initialEntries: ["/saker/101"],
    },
  );

  return render(<RouterProvider router={router} />);
}

describe("SakDetaljSide render", () => {
  beforeEach(() => {
    resetMockSaker();
    resetMockMineSaker();
    resetHistorikk();
  });

  it("viser lagre og avbryt i redigeringsmodus", async () => {
    renderDetaljside();

    fireEvent.click(await screen.findByRole("button", { name: "Rediger saksinformasjon" }));

    expect(await screen.findByRole("button", { name: "Lagre" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Avbryt" })).toBeDefined();
    expect(screen.getByLabelText("Kategori")).toBeDefined();
  });

  it("viser misbruktype når kategori byttes til en kategori med misbrukstyper", async () => {
    renderDetaljside();

    fireEvent.click(await screen.findByRole("button", { name: "Rediger saksinformasjon" }));
    fireEvent.change(await screen.findByLabelText("Kategori"), {
      target: { value: "MISBRUK" },
    });

    expect(await screen.findByLabelText("Misbruktype")).toBeDefined();
  });

  it("deaktiverer redigering for unsupported saksmodell", async () => {
    mockKontrollsaker[0].misbruktype = ["Endret sivilstatus", "Skjult samliv"];

    renderDetaljside();

    expect(
      (await screen.findByRole("button", { name: "Rediger saksinformasjon" })).getAttribute(
        "disabled",
      ),
    ).not.toBeNull();
    expect(
      screen.getByText(
        "Redigering støttes foreløpig bare for saker med én misbrukstype, én merking og én felles periode.",
      ),
    ).toBeDefined();
  });
});
