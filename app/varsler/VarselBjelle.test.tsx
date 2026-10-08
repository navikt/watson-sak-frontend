import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Varsel } from "./typer";
import { VarselBjelle } from "./VarselBjelle";

const state = vi.hoisted(() => ({ varsler: [] as Varsel[] }));
vi.mock("./bruk-varsler", () => ({
  VARSLER_FETCHER_KEY: "varsler-polling",
  useVarsler: () => state.varsler,
  useRefreshVarsler: () => vi.fn(),
}));

function lagUlesteVarsler(antall: number): Varsel[] {
  return Array.from({ length: antall }, (_, indeks) => ({
    id: `varsel-${indeks}`,
    sakId: `${indeks}`,
    tittel: `Varsel ${indeks}`,
    tekst: "Tekst",
    tidspunkt: "2026-10-08T09:00:00",
    erLest: false,
  }));
}

function visBjelle() {
  const Stub = createRoutesStub([{ path: "/", Component: VarselBjelle }]);
  return render(<Stub initialEntries={["/"]} />);
}

describe("VarselBjelle", () => {
  beforeEach(() => {
    state.varsler = [];
  });

  it("viser ikke merke når ingen varsler er uleste", async () => {
    const { container } = visBjelle();

    await screen.findByRole("button", { name: "Varsler, ingen uleste" });
    expect(container.querySelector(".aksel-badge")).toBeNull();
  });

  it("viser rødt merke med antall uleste", async () => {
    state.varsler = lagUlesteVarsler(3);
    const { container } = visBjelle();

    await screen.findByRole("button", { name: "Varsler, 3 uleste" });
    const merke = container.querySelector(".aksel-badge");
    expect(merke?.textContent).toBe("3");
    expect(merke?.getAttribute("data-color")).toBe("danger");
    expect(merke?.getAttribute("aria-hidden")).toBe("true");
  });

  it("viser 99+ når mer enn 99 varsler er uleste", async () => {
    state.varsler = lagUlesteVarsler(120);
    const { container } = visBjelle();

    await screen.findByRole("button", { name: "Varsler, 120 uleste" });
    expect(container.querySelector(".aksel-badge")?.textContent).toBe("99+");
  });

  it("teller ikke leste varsler", async () => {
    state.varsler = [
      ...lagUlesteVarsler(2),
      { ...lagUlesteVarsler(1)[0], id: "lest", erLest: true },
    ];
    const { container } = visBjelle();

    await screen.findByRole("button", { name: "Varsler, 2 uleste" });
    expect(container.querySelector(".aksel-badge")?.textContent).toBe("2");
  });
});
