import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { Miljø } from "~/config/backend-config";
import { AppSidebar } from "./AppSidebar";

const state = vi.hoisted(() => ({ miljø: "local-mock" as Miljø | undefined }));
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
  it.each<Miljø>(["local-mock", "demo"])("vises i %s", (miljø) => {
    state.miljø = miljø;
    visSidebar();
    expect(screen.getByRole("link", { name: "Migrering" }).getAttribute("href")).toBe("/migrering");
  });

  it.each<Miljø | undefined>(["prod", "dev", "local-dev", "local-backend", undefined])(
    "skjules i %s",
    (miljø) => {
      state.miljø = miljø;
      visSidebar();
      expect(screen.queryByRole("link", { name: "Migrering" })).toBeNull();
      expect(screen.getByRole("link", { name: "Mine saker" })).not.toBeNull();
    },
  );
});
