import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import type { FilResponse } from "./typer";
import { VedleggSeksjon } from "./VedleggSeksjon";

const mockFiler: FilResponse[] = [
  {
    id: "fil-1",
    filnavn: "anmeldelse.pdf",
    storrelse: 204800,
    contentType: "application/pdf",
    opprettetAv: "Ola Nordmann",
    opprettet: "2026-02-15T10:30:00Z",
    bruktIDokumenter: [],
  },
  {
    id: "fil-2",
    filnavn: "screenshot.png",
    storrelse: 51200,
    contentType: "image/png",
    opprettetAv: "Kari Hansen",
    opprettet: "2026-03-01T14:00:00Z",
    bruktIDokumenter: [],
  },
];

async function renderSeksjon(props: Parameters<typeof VedleggSeksjon>[0]) {
  const Stub = createRoutesStub([
    {
      path: "/saker/:sakId",
      Component: () => <VedleggSeksjon {...props} />,
    },
  ]);
  const resultat = render(<Stub initialEntries={["/saker/SAK-1"]} />);
  await waitFor(() => {});
  return resultat;
}

describe("VedleggSeksjon", () => {
  it("viser caption 'Opplastede filer'", async () => {
    await renderSeksjon({ filer: [], sakId: "SAK-1", erSakseier: false });
    expect(screen.getByRole("heading", { name: "Opplastede filer" })).toBeDefined();
  });

  it("viser tomtilstand når det ikke er noen filer", async () => {
    await renderSeksjon({ filer: [], sakId: "SAK-1", erSakseier: false });
    expect(screen.getByText("Ingen opplastede filer ennå")).toBeDefined();
  });

  it("viser filnavn for hver fil", async () => {
    await renderSeksjon({ filer: mockFiler, sakId: "SAK-1", erSakseier: false });
    expect(screen.getByText("anmeldelse.pdf")).toBeDefined();
    expect(screen.getByText("screenshot.png")).toBeDefined();
  });

  it("viser størrelse og type i metadatalinjen", async () => {
    await renderSeksjon({ filer: mockFiler, sakId: "SAK-1", erSakseier: false });
    expect(screen.getByText(/PDF · 200 KB/)).toBeDefined();
    expect(screen.getByText(/Bilde · 50 KB/)).toBeDefined();
  });

  it("viser hvem som lastet opp", async () => {
    await renderSeksjon({ filer: mockFiler, sakId: "SAK-1", erSakseier: false });
    expect(screen.getByText(/Ola Nordmann/)).toBeDefined();
    expect(screen.getByText(/Kari Hansen/)).toBeDefined();
  });

  it("viser åpne-knapp for hver fil", async () => {
    await renderSeksjon({ filer: mockFiler, sakId: "SAK-1", erSakseier: false });
    expect(screen.getByLabelText("Åpne anmeldelse.pdf")).toBeDefined();
    expect(screen.getByLabelText("Åpne screenshot.png")).toBeDefined();
  });

  it("viser ikke slett-knapp når erSakseier er false", async () => {
    await renderSeksjon({ filer: mockFiler, sakId: "SAK-1", erSakseier: false });
    expect(screen.queryByLabelText("Slett anmeldelse.pdf")).toBeNull();
  });

  it("viser slett-knapp kun når erSakseier er true", async () => {
    await renderSeksjon({ filer: mockFiler, sakId: "SAK-1", erSakseier: true });
    expect(screen.getByLabelText("Slett anmeldelse.pdf")).toBeDefined();
    expect(screen.getByLabelText("Slett screenshot.png")).toBeDefined();
  });

  it("viser lastespinner når en opplasting pågår", async () => {
    await renderSeksjon({ filer: [], sakId: "SAK-1", erSakseier: false, lasterOpp: true });
    expect(screen.getByText("Laster opp …")).toBeDefined();
  });

  it("viser feilmelding fra serveren", async () => {
    await renderSeksjon({
      filer: [],
      sakId: "SAK-1",
      erSakseier: false,
      feilFraServer: "Filen er for stor",
    });
    expect(screen.getByText("Filen er for stor")).toBeDefined();
  });

  it("viser 'i bruk'-ikon når filen er satt inn i et dokument", async () => {
    const filerMedBruk: FilResponse[] = [
      { ...mockFiler[1], bruktIDokumenter: [{ id: "dok-1", tittel: "Saksframlegg" }] },
    ];
    await renderSeksjon({ filer: filerMedBruk, sakId: "SAK-1", erSakseier: false });
    expect(screen.getByLabelText("Filen er i bruk i 1 dokument(er)")).toBeDefined();
  });

  it("viser ikke 'i bruk'-ikon når filen ikke er i bruk", async () => {
    await renderSeksjon({ filer: mockFiler, sakId: "SAK-1", erSakseier: false });
    expect(screen.queryByText(/er i bruk i/)).toBeNull();
  });

  it("viser forklarende dialog i stedet for å slette når filen er i bruk", async () => {
    const filerMedBruk: FilResponse[] = [
      { ...mockFiler[1], bruktIDokumenter: [{ id: "dok-1", tittel: "Saksframlegg" }] },
    ];
    await renderSeksjon({ filer: filerMedBruk, sakId: "SAK-1", erSakseier: true });

    fireEvent.click(screen.getByLabelText("Slett screenshot.png"));
    await waitFor(() => {});

    expect(screen.getByText("Filen er i bruk")).toBeDefined();
    const lenke = screen.getByRole("link", { name: "Saksframlegg" });
    expect(lenke.getAttribute("href")).toBe("/saker/SAK-1/dokumenter/dok-1");
  });

  it("viser bekreftelsesdialog før en fil slettes", async () => {
    await renderSeksjon({ filer: mockFiler, sakId: "SAK-1", erSakseier: true });

    fireEvent.click(screen.getByLabelText("Slett screenshot.png"));
    await waitFor(() => {});

    expect(screen.getByText("Slette vedlegg?")).toBeDefined();
    expect(screen.getByRole("button", { name: "Slett vedlegg" })).toBeDefined();
  });

  it("lukker bekreftelsesdialogen uten å slette", async () => {
    await renderSeksjon({ filer: mockFiler, sakId: "SAK-1", erSakseier: true });

    fireEvent.click(screen.getByLabelText("Slett screenshot.png"));
    await waitFor(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }));
    await waitFor(() => {});

    expect(screen.queryByText("Slette vedlegg?")).toBeNull();
  });
});
