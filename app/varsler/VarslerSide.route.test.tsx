import { fireEvent, render, screen } from "@testing-library/react";
import { createRoutesStub, Link } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { Varsel } from "./typer";
import VarslerSide from "./VarslerSide.route";

vi.mock("./VarslerSide.action.server", () => ({ action: vi.fn() }));
vi.mock("./VarslerSide.loader.server", () => ({ loader: vi.fn() }));

function lagVarsel(id: string, erLest: boolean): Varsel {
  return {
    id,
    sakId: "sak-1",
    tittel: `Varsel ${id}`,
    tekst: "Varseltekst",
    tidspunkt: "2026-05-02T08:32:00Z",
    erLest,
  };
}

function lagLoaderData(varsler: Varsel[], antallUleste: number, antallLeste: number) {
  return {
    varsler,
    harFlere: false,
    totalItems: antallUleste + antallLeste,
    antallUleste,
    antallLeste,
    page: 1,
  };
}

function visSide(
  loaderData: ReturnType<typeof lagLoaderData>,
  { fraAnnenSide = false, action }: { fraAnnenSide?: boolean; action?: () => unknown } = {},
) {
  const Stub = createRoutesStub([
    { path: "/", Component: () => <Link to="/varsler">Til varsler</Link> },
    { path: "/varsler", Component: VarslerSide, loader: () => loaderData, action },
  ]);
  return render(<Stub initialEntries={[fraAnnenSide ? "/" : "/varsler"]} />);
}

describe("VarslerSide", () => {
  it("viser teknisk feil og feil-ID når varsler ikke kan markeres som lest", async () => {
    visSide(lagLoaderData([lagVarsel("1", false)], 1, 0), {
      action: () => ({ ok: false, teknisk: true, feilId: "deadbeef" }),
    });

    fireEvent.click(await screen.findByRole("button", { name: "Marker alle som lest" }));

    expect(await screen.findByText("Vi fikk ikke markert varslene som lest")).toBeTruthy();
    expect(screen.getByText("deadbeef")).toBeTruthy();
  });

  it("grupperer varsler i uleste og leste med totalt antall fra loaderen", async () => {
    visSide(lagLoaderData([lagVarsel("1", false), lagVarsel("2", true)], 5, 4));

    expect(await screen.findByRole("heading", { level: 2, name: "Uleste (5)" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Leste (4)" })).toBeTruthy();
    expect(screen.getAllByText("02.05.2026, 10:32")).toHaveLength(2);
  });

  it("skjuler gruppen når ingen lastede varsler hører til den", async () => {
    visSide(lagLoaderData([lagVarsel("2", true)], 0, 1));

    expect(await screen.findByRole("heading", { level: 2, name: "Leste (1)" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /Uleste/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Marker alle som lest" })).toBeNull();
  });

  it("skjuler «Gå tilbake» når siden er åpnet direkte", async () => {
    visSide(lagLoaderData([lagVarsel("1", false)], 1, 0));

    await screen.findByRole("heading", { level: 1, name: "Varsler" });
    expect(screen.queryByRole("button", { name: "Gå tilbake" })).toBeNull();
  });

  it("viser «Gå tilbake» når brukeren kom fra en annen side", async () => {
    visSide(lagLoaderData([lagVarsel("1", false)], 1, 0), { fraAnnenSide: true });

    fireEvent.click(await screen.findByRole("link", { name: "Til varsler" }));

    expect(await screen.findByRole("button", { name: "Gå tilbake" })).toBeTruthy();
  });
});
