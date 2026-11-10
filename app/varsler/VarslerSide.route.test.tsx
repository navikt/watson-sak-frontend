import { fireEvent, render, screen, within } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { Varsel } from "./typer";
import VarslerSide from "./VarslerSide.route";

vi.mock("./VarslerSide.action.server", () => ({ action: vi.fn() }));
vi.mock("./VarslerSide.loader.server", () => ({ loader: vi.fn() }));

function lagVarsel(id: string, erLest: boolean, sakId = "69"): Varsel {
  return {
    id,
    sakId,
    tittel: `Varsel ${id}`,
    tekst: "Varseltekst",
    tidspunkt: "2026-05-02T08:32:00Z",
    erLest,
  };
}

type Gruppe = { varsler: Varsel[]; totalItems: number; totalSider?: number; side?: number };

function lagLoaderData(uleste: Gruppe, leste: Gruppe) {
  const ulesteSider = uleste.totalSider ?? 1;
  return {
    uleste: {
      ...uleste,
      totalSider: ulesteSider,
      side: uleste.side ?? 1,
      harFlere: (uleste.side ?? 1) < ulesteSider,
    },
    leste: { ...leste, totalSider: leste.totalSider ?? 1, side: leste.side ?? 1 },
  };
}

function visSide(
  loader: (args: { request: Request }) => unknown,
  { action }: { action?: () => unknown } = {},
) {
  const Stub = createRoutesStub([{ path: "/varsler", Component: VarslerSide, loader, action }]);
  return render(<Stub initialEntries={["/varsler"]} />);
}

const standard = () =>
  lagLoaderData(
    { varsler: [lagVarsel("1", false)], totalItems: 1 },
    { varsler: [lagVarsel("2", true)], totalItems: 1 },
  );

describe("VarslerSide", () => {
  it("viser teknisk feil og feil-ID når varsler ikke kan markeres som lest", async () => {
    visSide(standard, { action: () => ({ ok: false, teknisk: true, feilId: "deadbeef" }) });

    fireEvent.click(await screen.findByRole("button", { name: "Marker alle som lest" }));

    expect(await screen.findByText("Vi fikk ikke markert varslene som lest")).toBeTruthy();
    expect(screen.getByText("deadbeef")).toBeTruthy();
  });

  it("viser saksnummer foran tittelen og tidspunktet", async () => {
    visSide(() =>
      lagLoaderData(
        { varsler: [lagVarsel("1", false, "69")], totalItems: 1 },
        { varsler: [], totalItems: 0 },
      ),
    );

    expect(await screen.findByRole("heading", { level: 3, name: "69: Varsel 1" })).toBeTruthy();
    expect(screen.getByText("02.05.2026, 10:32")).toBeTruthy();
  });

  it("grupperer varsler i uleste og leste med totalt antall", async () => {
    visSide(() =>
      lagLoaderData(
        { varsler: [lagVarsel("1", false)], totalItems: 5 },
        { varsler: [lagVarsel("2", true)], totalItems: 40 },
      ),
    );

    expect(await screen.findByRole("heading", { level: 2, name: "Uleste (5)" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: "Leste (40)" })).toBeTruthy();
  });

  it("skjuler gruppen uten varsler", async () => {
    visSide(() =>
      lagLoaderData(
        { varsler: [], totalItems: 0 },
        { varsler: [lagVarsel("2", true)], totalItems: 1 },
      ),
    );

    expect(await screen.findByRole("heading", { level: 2, name: "Leste (1)" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: /Uleste/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Marker alle som lest" })).toBeNull();
  });

  it("viser vanlig paginering for leste og bytter side via URL-en", async () => {
    visSide(({ request }) => {
      const side = Number(new URL(request.url).searchParams.get("side") ?? "1");
      return lagLoaderData(
        { varsler: [], totalItems: 0 },
        { varsler: [lagVarsel(`lest-side-${side}`, true)], totalItems: 25, totalSider: 3, side },
      );
    });

    const leste = await screen.findByRole("region", { name: "Leste" });
    fireEvent.click(within(leste).getByRole("button", { name: "2" }));

    expect(
      await screen.findByRole("heading", { level: 3, name: "69: Varsel lest-side-2" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Last flere/ })).toBeNull();
  });

  it("laster flere uleste og beholder dem når brukeren blar i leste", async () => {
    visSide(({ request }) => {
      const params = new URL(request.url).searchParams;
      const ulesteSide = Number(params.get("ulesteSide") ?? "1");
      const side = Number(params.get("side") ?? "1");
      return lagLoaderData(
        {
          varsler: [lagVarsel(`ulest-${ulesteSide}`, false)],
          totalItems: 2,
          totalSider: 2,
          side: ulesteSide,
        },
        { varsler: [lagVarsel(`lest-${side}`, true)], totalItems: 20, totalSider: 2, side },
      );
    });

    fireEvent.click(await screen.findByRole("button", { name: "Last flere uleste" }));
    expect(
      await screen.findByRole("heading", { level: 3, name: "69: Varsel ulest-2" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Last flere uleste" })).toBeNull();

    const leste = screen.getByRole("region", { name: "Leste" });
    fireEvent.click(within(leste).getByRole("button", { name: "2" }));

    expect(
      await screen.findByRole("heading", { level: 3, name: "69: Varsel lest-2" }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "69: Varsel ulest-1" })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 3, name: "69: Varsel ulest-2" })).toBeTruthy();
  });

  it("kan laste flere uleste etter «Marker alle som lest» selv om fetcheren revalideres", async () => {
    let markert = false;
    visSide(
      ({ request }) => {
        const ulesteSide = Number(new URL(request.url).searchParams.get("ulesteSide") ?? "1");
        const prefiks = markert ? "ny" : "gammel";
        const totalSider = markert ? 2 : 3;
        return lagLoaderData(
          {
            varsler: ulesteSide <= totalSider ? [lagVarsel(`${prefiks}-${ulesteSide}`, false)] : [],
            totalItems: totalSider,
            totalSider,
            side: ulesteSide,
          },
          { varsler: [], totalItems: 0 },
        );
      },
      {
        action: () => {
          markert = true;
          return { ok: true };
        },
      },
    );

    fireEvent.click(await screen.findByRole("button", { name: "Last flere uleste" }));
    await screen.findByRole("heading", { level: 3, name: "69: Varsel gammel-2" });
    fireEvent.click(screen.getByRole("button", { name: "Last flere uleste" }));
    await screen.findByRole("heading", { level: 3, name: "69: Varsel gammel-3" });

    fireEvent.click(screen.getByRole("button", { name: "Marker alle som lest" }));
    await screen.findByRole("heading", { level: 3, name: "69: Varsel ny-1" });

    fireEvent.click(await screen.findByRole("button", { name: "Last flere uleste" }));
    expect(await screen.findByRole("heading", { level: 3, name: "69: Varsel ny-2" })).toBeTruthy();
  });

  it("skjuler «Gå tilbake» når siden er åpnet direkte", async () => {
    window.history.replaceState({ idx: 0 }, "");
    visSide(standard);

    await screen.findByRole("heading", { level: 1, name: "Varsler" });
    expect(screen.queryByRole("button", { name: "Gå tilbake" })).toBeNull();
  });

  it("viser «Gå tilbake» når det finnes en tidligere side i historikken, også etter omlasting", async () => {
    window.history.replaceState({ idx: 2 }, "");
    visSide(standard);

    expect(await screen.findByRole("button", { name: "Gå tilbake" })).toBeTruthy();
  });

  it("viser ikke «Gå tilbake» etter innsending når siden ble åpnet direkte", async () => {
    window.history.replaceState({ idx: 0 }, "");
    visSide(standard, { action: () => ({ ok: true }) });

    fireEvent.click(await screen.findByRole("button", { name: "Marker alle som lest" }));

    await screen.findByRole("heading", { level: 1, name: "Varsler" });
    expect(screen.queryByRole("button", { name: "Gå tilbake" })).toBeNull();
  });
});
