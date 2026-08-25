import { fireEvent, render, screen } from "@testing-library/react";
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
    id: 1,
    saksreferanse: "201",
    detaljHref: "/saker/201",
    navn: "Ola Nordmann",
    kategori: "Samliv",
    misbrukstyper: ["Skjult samliv"],
    status: "Opprettet",
    ventestatus: null,
    opprettet: "2026-02-03T10:11:12Z",
    oppdatert: "2026-02-03T10:11:12Z",
    saksbehandler: null,
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
    expect(screen.getByRole("link", { name: "#201" }).getAttribute("href")).toBe("/saker/201");
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

  it("viser tomtekst inni tabellen med headere synlige når listen er tom", () => {
    renderMedRouter(<Saksliste rader={[]} tomTekst="Ingen saker akkurat nå." />);

    expect(screen.getByText("Ingen saker akkurat nå.")).toBeDefined();
    expect(screen.getByRole("table")).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Saksid" })).toBeDefined();
  });

  it("gjør raden fokuserbar og navigerer med Enter-tasten", () => {
    const router = createMemoryRouter(
      [
        { path: "/", element: <Saksliste rader={rader} tomTekst="Ingen saker." /> },
        { path: "/saker/:sakId", element: <p>Sakdetaljer</p> },
      ],
      { initialEntries: ["/"] },
    );
    render(<RouterProvider router={router} />);

    const rad = screen.getByRole("row", { name: /#201/ });
    expect(rad.getAttribute("tabindex")).toBe("0");

    fireEvent.keyDown(rad, { key: "Enter" });

    expect(screen.getByText("Sakdetaljer")).toBeDefined();
  });

  it("navigerer ikke når Enter trykkes på en knapp inni raden", () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: (
            <Saksliste
              rader={rader}
              tomTekst="Ingen saker."
              renderRadHandling={() => <button type="button">Tildel</button>}
            />
          ),
        },
        { path: "/saker/:sakId", element: <p>Sakdetaljer</p> },
      ],
      { initialEntries: ["/"] },
    );
    render(<RouterProvider router={router} />);

    const tildelKnapp = screen.getByRole("button", { name: "Tildel" });
    fireEvent.keyDown(tildelKnapp, { key: "Enter" });

    expect(screen.queryByText("Sakdetaljer")).toBeNull();
  });

  it("navigerer ikke når man klikker på en knapp inni raden", () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: (
            <Saksliste
              rader={rader}
              tomTekst="Ingen saker."
              renderRadHandling={() => <button type="button">Tildel</button>}
            />
          ),
        },
        { path: "/saker/:sakId", element: <p>Sakdetaljer</p> },
      ],
      { initialEntries: ["/"] },
    );
    render(<RouterProvider router={router} />);

    const tildelKnapp = screen.getByRole("button", { name: "Tildel" });
    fireEvent.click(tildelKnapp);

    expect(screen.queryByText("Sakdetaljer")).toBeNull();
  });

  it("navigerer når man klikker på en celle i raden (ikke bare på selve raden)", () => {
    const router = createMemoryRouter(
      [
        { path: "/", element: <Saksliste rader={rader} tomTekst="Ingen saker." /> },
        { path: "/saker/:sakId", element: <p>Sakdetaljer</p> },
      ],
      { initialEntries: ["/"] },
    );
    render(<RouterProvider router={router} />);

    // Klikker på navn-teksten (ikke lenka i saksid-cellen, og ikke raden selv) —
    // skal likevel navigere, siden hele raden er klikkbar.
    fireEvent.click(screen.getByText("Ola Nordmann"));

    expect(screen.getByText("Sakdetaljer")).toBeDefined();
  });
});
