import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { Saksliste, type SakslisteRad } from "./Saksliste";

function renderMedRouter(ui: React.ReactNode) {
  const router = createMemoryRouter([{ path: "/", element: ui }], {
    initialEntries: ["/"],
  });

  return render(<RouterProvider router={router} />);
}

const rader: SakslisteRad[] = [
  {
    id: "1",
    saksreferanse: "201",
    detaljHref: "/saker/201",
    navn: "Ola Nordmann",
    kategori: "Samliv",
    misbrukstyper: ["Skjult samliv"],
    status: { tekst: "Ufordelt", variant: "info" },
    opprettet: "2026-02-03T10:11:12Z",
    oppdatert: "2026-02-03T10:11:12Z",
  },
];

describe("Saksliste", () => {
  it("viser standardkolonnene og detaljlenke", () => {
    renderMedRouter(<Saksliste rader={rader} tomTekst="Ingen saker." />);

    expect(screen.getByRole("columnheader", { name: "Saksid" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Navn" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Kategori" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Misbrukstype" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Opprettet" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Oppdatert" })).toBeDefined();
    expect(screen.getByRole("link", { name: "201" }).getAttribute("href")).toBe("/saker/201");
  });

  it("kan skjule navn og vise handlingskolonne", () => {
    renderMedRouter(
      <Saksliste
        rader={rader}
        kolonner={["saksid", "kategori", "misbrukstype", "opprettet", "oppdatert"]}
        tomTekst="Ingen saker."
        renderRadHandling={() => <button type="button">Tildel</button>}
      />,
    );

    expect(screen.queryByRole("columnheader", { name: "Navn" })).toBeNull();
    expect(screen.getByRole("columnheader", { name: "Handling" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Tildel" })).toBeDefined();
  });

  it("viser tomtekst uten tabell når listen er tom", () => {
    renderMedRouter(<Saksliste rader={[]} tomTekst="Ingen saker akkurat nå." />);

    expect(screen.getByText("Ingen saker akkurat nå.")).toBeDefined();
    expect(screen.queryByRole("table")).toBeNull();
  });
});
