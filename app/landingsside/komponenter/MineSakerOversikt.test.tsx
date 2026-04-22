import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { lagMockSakUuid } from "~/saker/mock-uuid";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { MineSakerOversikt } from "./MineSakerOversikt";

function lagKontrollsak(overrides: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: lagMockSakUuid("201", 2),
    personIdent: "10987654321",
    personNavn: "Ola Nordmann",
    saksbehandlere: {
      eier: { navIdent: "Z123456", navn: "Ola Saksbehandler", enhet: "4812" },
      deltMed: [],
      opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
    },
    status: "OPPRETTET",
    kategori: "SAMLIV",
    kilde: "PUBLIKUM",
    misbruktype: ["SKJULT_SAMLIV"],
    prioritet: "NORMAL",
    avslutningskonklusjon: null,
    tilgjengeligeHandlinger: [],
    ytelser: [
      {
        id: "00000000-0000-4000-8000-000000020101",
        type: "Sykepenger",
        periodeFra: "2026-01-01",
        periodeTil: "2026-01-31",
        belop: null,
      },
    ],
    merking: null,
    resultat: null,
    opprettet: "2026-02-03T10:11:12Z",
    oppdatert: null,
    ...overrides,
  };
}

function renderMedRouter(ui: React.ReactNode) {
  const router = createMemoryRouter([{ path: "/", element: ui }], {
    initialEntries: ["/"],
  });

  return render(<RouterProvider router={router} />);
}

describe("MineSakerOversikt", () => {
  it("viser ønskede kolonner og bruker opprettet som fallback for oppdatert", () => {
    renderMedRouter(
      <MineSakerOversikt
        saker={[
          lagKontrollsak(),
          lagKontrollsak({
            id: lagMockSakUuid("202", 2),
            personNavn: "",
            kategori: "ANNET",
            misbruktype: [],
            opprettet: "2026-03-05T00:00:00Z",
            oppdatert: "2026-03-06T00:00:00Z",
          }),
        ]}
      />,
    );

    expect(screen.getByRole("columnheader", { name: "Saksid" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Navn" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Kategori" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Misbrukstype" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Opprettet" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Oppdatert" })).toBeDefined();

    expect(screen.getByRole("link", { name: "201" })).toBeDefined();
    expect(screen.getByRole("link", { name: "202" })).toBeDefined();
    expect(screen.getByText("Ola Nordmann")).toBeDefined();
    expect(screen.getByText("Samliv")).toBeDefined();
    expect(screen.getByText("Annet")).toBeDefined();
    expect(screen.getByText("Skjult samliv")).toBeDefined();
    expect(screen.getAllByText("–")).toHaveLength(1);
    expect(screen.getAllByText("3. feb. 2026")).toHaveLength(2);
    expect(screen.getByText("6. mars 2026")).toBeDefined();
  });
});
