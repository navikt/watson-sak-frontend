import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockKodeverk } from "~/testing/mock-store/kodeverk.server";
import OpprettSakSide from "./RegistrerSakSide.route";

const state = vi.hoisted(() => ({
  miljø: "local-backend",
  legacyPid: null as string | null,
  legacyKilde: null as string | null,
}));
vi.mock("~/miljø/useMiljø", () => ({ useMiljø: () => state.miljø }));
vi.mock("~/kodeverk/useKodeverk", () => ({ useKodeverk: () => mockKodeverk }));
vi.mock("./RegistrerSakSide.server", () => ({
  loader: () => ({ fnr: null, legacyPid: null, legacyKilde: null }),
  action: vi.fn(),
}));
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useFetcher: () => ({
      Form: actual.Form,
      state: "idle",
      data: {
        person: {
          navn: "Testperson",
          personnummer: "11111111111",
          alder: 42,
          adresseskjermet: false,
          kanOppretteSak: true,
        },
        eksisterendeSaker: [],
      },
      submit: vi.fn(),
    }),
  };
});

function renderSide() {
  const router = createMemoryRouter(
    [
      {
        path: "/registrer-sak",
        Component: OpprettSakSide,
        loader: () => ({ fnr: null, legacyPid: state.legacyPid, legacyKilde: state.legacyKilde }),
      },
    ],
    { initialEntries: ["/registrer-sak"] },
  );
  return render(<RouterProvider router={router} />);
}

describe("Notat i Opprett sak", () => {
  beforeEach(() => {
    state.miljø = "local-backend";
    state.legacyPid = null;
    state.legacyKilde = null;
  });

  it.each(["local-backend", "local-mock"])(
    "viser Notat bare for migreringssaker i %s",
    async (miljø) => {
      state.miljø = miljø;
      state.legacyPid = "100245";
      state.legacyKilde = "UTREDNING";
      renderSide();
      const notat = await screen.findByRole("textbox", { name: "Notat" });
      expect((notat as HTMLTextAreaElement).disabled).toBe(true);
      expect(screen.getByText("Forhåndsvisning. Notatet kan ikke lagres ennå.")).toBeDefined();
    },
  );

  it("viser ikke Notat for vanlige saker", async () => {
    renderSide();
    await screen.findByRole("heading", { name: "Grunnleggende saksinformasjon" });
    expect(screen.queryByRole("textbox", { name: "Notat" })).toBeNull();
  });

  it.each([
    { legacyPid: "100245", legacyKilde: null },
    { legacyPid: null, legacyKilde: "UTREDNING" },
  ])(
    "viser ikke Notat når migreringsnøkkelen er ufullstendig",
    async ({ legacyPid, legacyKilde }) => {
      state.legacyPid = legacyPid;
      state.legacyKilde = legacyKilde;
      renderSide();
      await screen.findByRole("heading", { name: "Grunnleggende saksinformasjon" });
      expect(screen.queryByRole("textbox", { name: "Notat" })).toBeNull();
    },
  );

  it("viser ikke forhåndsvisningen i prod", async () => {
    state.miljø = "prod";
    state.legacyPid = "100245";
    state.legacyKilde = "UTREDNING";
    renderSide();
    await screen.findByRole("heading", { name: "Grunnleggende saksinformasjon" });
    expect(screen.queryByRole("textbox", { name: "Notat" })).toBeNull();
  });
});
