import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Miljø } from "~/config/backend-config";
import { AppSidebar } from "./AppSidebar";

const state = vi.hoisted(() => ({ miljø: "local-mock" as Miljø | undefined, erLesebruker: false }));
vi.mock("~/auth/innlogget-bruker", () => ({
  useInnloggetBruker: () => ({ erLesebruker: state.erLesebruker }),
}));
vi.mock("~/miljø/useMiljø", () => ({ useMiljø: () => state.miljø }));
vi.mock("~/preferanser/PreferencesContext", () => ({
  usePreferences: () => ({ preferences: { sidebarKollapset: false }, oppdaterPreference: vi.fn() }),
}));
vi.mock("./InnstillingerModal", () => ({ InnstillingerModal: () => null }));

function visSidebar() {
  const Stub = createRoutesStub([{ path: "/", Component: AppSidebar }]);
  render(<Stub initialEntries={["/"]} />);
}

describe("Migreringslenke i sidebar", () => {
  beforeEach(() => {
    state.erLesebruker = false;
  });

  it.each<Miljø>(["local-mock", "prod"])(
    "skjuler skriveinnganger for lesebruker og beholder søk og statistikk i %s",
    (miljø) => {
      state.erLesebruker = true;
      state.miljø = miljø;
      visSidebar();
      expect(screen.queryByRole("link", { name: "Opprett sak" })).toBeNull();
      expect(screen.queryByRole("link", { name: "Flytt fra Access" })).toBeNull();
      expect(screen.getByRole("link", { name: "Alle saker" })).not.toBeNull();
      expect(screen.getByRole("link", { name: "Statistikk" })).not.toBeNull();
    },
  );

  it.each<Miljø>(["local-mock", "local-backend", "demo", "dev", "prod"])("vises i %s", (miljø) => {
    state.miljø = miljø;
    visSidebar();
    const migreringslenke = screen.getByRole("link", { name: "Flytt fra Access" });
    expect(migreringslenke.getAttribute("href")).toBe("/migrering");
    expect(screen.getAllByRole("link").at(-1)).toBe(migreringslenke);
  });

  it.each<Miljø | undefined>(["local-dev", undefined])("skjules i %s", (miljø) => {
    state.miljø = miljø;
    visSidebar();
    expect(screen.queryByRole("link", { name: "Flytt fra Access" })).toBeNull();
    expect(screen.getByRole("link", { name: "Mine saker" })).not.toBeNull();
  });
});
