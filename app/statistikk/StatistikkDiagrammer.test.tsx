import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { lagMockStatistikk } from "./mock.server";
import { StatistikkDiagrammer } from "./StatistikkDiagrammer";

function renderMedRouter(
  endreData: (
    data: ReturnType<typeof lagMockStatistikk>,
  ) => ReturnType<typeof lagMockStatistikk> = (data) => data,
) {
  const data = endreData(
    lagMockStatistikk(
      { nivaa: "underavdeling", fra: "2026-09-01", til: "2026-09-30" },
      "Øst",
      "ky153k",
    ),
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

  it("viser prosenter med én desimal og humaniserer tekniske koder", () => {
    renderMedRouter((data) => ({
      ...data,
      statusfordeling: data.statusfordeling.map((status, index) =>
        index === 0 ? { ...status, navn: "STRAFFERETTSLIG_VURDERING" } : status,
      ),
    }));

    expect(screen.getByText("72,0 %")).toBeDefined();
    expect(screen.getByText("Strafferettslig vurdering")).toBeDefined();
  });

  it("gir statuslabels en egen wrappende layoutkolonne", () => {
    renderMedRouter((data) => ({
      ...data,
      statusfordeling: data.statusfordeling.map((status, index) =>
        index === 0 ? { ...status, navn: "STRAFFERETTSLIG_VURDERING" } : status,
      ),
    }));

    const statuslabel = screen.getByText("Strafferettslig vurdering");
    expect(statuslabel.className).toContain("break-words");
    expect(statuslabel.parentElement?.className).toContain(
      "grid-cols-[minmax(8rem,auto)_minmax(0,1fr)_auto]",
    );
  });
});
