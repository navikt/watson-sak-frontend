import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { DokumentInnhold, DokumentNode } from "~/saker/filer/typer";
import DokumentSide from "./DokumentSide.route";

vi.mock("~/config/env.server", () => ({
  skalBrukeMockdata: true,
  env: { ENVIRONMENT: "local-mock" },
}));

vi.mock("~/auth/innlogget-bruker.server", () => ({
  hentInnloggetBruker: async () => ({
    navIdent: "Z999999",
    name: "Test Saksbehandler",
    preferredUsername: "test@nav.no",
    enhet: "4812",
  }),
}));

vi.mock("~/analytics/analytics", () => ({
  sporHendelse: vi.fn(),
}));

const innhold: DokumentInnhold = { type: "doc", content: [{ type: "paragraph" }] };

const dokumenter: DokumentNode[] = [
  { id: "1", type: "dokument", tittel: "Saksframlegg", endretAv: "Ola", endretDato: "2026-02-15" },
  { id: "2", type: "dokument", tittel: "Vedtak", endretAv: "Kari", endretDato: "2026-02-20" },
];

function renderSide(kanRedigere: boolean) {
  const Stub = createRoutesStub([
    {
      path: "/saker/:sakId/dokumenter/:docId",
      Component: DokumentSide,
      loader: () => ({
        dokument: {
          id: "1",
          tittel: "Saksframlegg",
          innhold,
          endretAv: "Ola",
          endretDato: "2026-02-15",
        },
        dokumenter,
        sakReferanse: "ABC-123",
        kanRedigere,
      }),
    },
  ]);
  return render(<Stub initialEntries={["/saker/ABC-123/dokumenter/1"]} />);
}

describe("DokumentSide", () => {
  it("viser tilbake- og «Se andre dokumenter»-knapp", async () => {
    renderSide(true);

    expect(await screen.findByRole("button", { name: "Tilbake" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Se andre dokumenter" })).toBeDefined();
  });

  it("viser slett-knapp når man kan redigere", async () => {
    renderSide(true);

    expect(await screen.findByRole("button", { name: "Slett dokument" })).toBeDefined();
  });

  it("skjuler slett-knapp uten redigeringstilgang", async () => {
    renderSide(false);

    expect(await screen.findByRole("button", { name: "Se andre dokumenter" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Slett dokument" })).toBeNull();
  });
});
