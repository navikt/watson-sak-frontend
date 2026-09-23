import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { lagMockStatistikk } from "./mock.server";
import { StatistikkDiagrammer } from "./StatistikkDiagrammer";

function renderMedRouter() {
  const data = lagMockStatistikk(
    { omfang: "enhet:ky153k", fra: "2026-09-01", til: "2026-09-30" },
    "Øst",
    "ky153k",
  );
  const router = createMemoryRouter(
    [
      { path: "/", element: <StatistikkDiagrammer data={data} /> },
      { path: "/alle-saker", element: <p>Alle saker</p> },
    ],
    { initialEntries: ["/"] },
  );
  return render(<RouterProvider router={router} />);
}

describe("StatistikkDiagrammer", () => {
  it("viser nøkkeltall og diagramtitler", () => {
    renderMedRouter();

    expect(screen.getByText("Øyeblikksbilde")).toBeDefined();
    expect(screen.getByText("Sakstype fordelt på status")).toBeDefined();
    expect(screen.getByText("Sakskategorifordeling")).toBeDefined();
  });

  it("lar brukeren skjule en status i stablede stolper", () => {
    renderMedRouter();

    fireEvent.click(screen.getByRole("button", { name: "Utredes" }));
    expect(screen.getByRole("button", { name: "Utredes" }).className).toContain("line-through");
  });

  it("lenker et segment til støttede kategori- og stegfiltre", () => {
    renderMedRouter();

    const lenke = screen.getByRole("link", { name: /Arbeid, Utredes/ });
    expect(lenke.getAttribute("href")).toBe("/alle-saker?kategori=ARBEID&steg=UTREDES");
  });
});
