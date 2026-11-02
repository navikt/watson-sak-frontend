import { fireEvent, render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi } from "vitest";
import VarslerSide from "./VarslerSide.route";

vi.mock("./VarslerSide.action.server", () => ({ action: vi.fn() }));
vi.mock("./VarslerSide.loader.server", () => ({ loader: vi.fn() }));

describe("VarslerSide", () => {
  it("viser teknisk feil og feil-ID når varsler ikke kan markeres som lest", async () => {
    const Stub = createRoutesStub([
      {
        path: "/varsler",
        Component: VarslerSide,
        loader: () => ({
          varsler: [
            {
              id: "varsel-1",
              sakId: "sak-1",
              tittel: "Nytt varsel",
              tekst: "Varseltekst",
              tidspunkt: "2026-10-08T09:00:00",
              erLest: false,
            },
          ],
          harFlere: false,
          totalItems: 1,
          page: 1,
        }),
        action: () => ({ ok: false, teknisk: true, feilId: "deadbeef" }),
      },
    ]);

    render(<Stub initialEntries={["/varsler"]} />);

    fireEvent.click(await screen.findByRole("button", { name: "Merk alle viste som lest" }));

    expect(await screen.findByText("Vi fikk ikke markert varslene som lest")).toBeTruthy();
    expect(screen.getByText("deadbeef")).toBeTruthy();
  });
});
