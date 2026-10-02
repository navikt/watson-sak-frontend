import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { lagMockStatistikk } from "./mock.server";
import { StatistikkDiagrammer } from "./StatistikkDiagrammer";

function renderMedRouter(
  endreData: (
    data: ReturnType<typeof lagMockStatistikk>,
  ) => ReturnType<typeof lagMockStatistikk> = (data) => data,
) {
  const data = endreData(
    lagMockStatistikk(
      { nivaa: "underavdeling", fra: "2026-09-01", til: "2026-09-30" },
      "Øst",
      "ky153k",
    ),
  );
  const router = createMemoryRouter(
    [
      { path: "/", element: <StatistikkDiagrammer data={data} /> },
      { path: "/alle-saker", element: <p>Alle saker</p> },
    ],
    { initialEntries: ["/"] },
  );
  return render(<RouterProvider router={router} />);
}

describe("StatistikkDiagrammer", () => {
  it("viser nøkkeltall og diagramtitler", () => {
    renderMedRouter();

    expect(screen.getByText("Øyeblikksbilde")).toBeDefined();
    expect(screen.getByText("Sakstype fordelt på status")).toBeDefined();
    expect(screen.getByText("Sakskategorifordeling")).toBeDefined();
  });

  it("lar brukeren skjule en status i stablede stolper", () => {
    renderMedRouter();

    fireEvent.click(screen.getByRole("button", { name: "Utredes" }));
    expect(screen.getByRole("button", { name: "Utredes" }).className).toContain("line-through");
  });

  it("lenker et segment til støttede kategori- og stegfiltre", () => {
    renderMedRouter();

    const lenke = screen.getByRole("link", { name: /Arbeid, Utredes/ });
    expect(lenke.getAttribute("href")).toBe("/alle-saker?kategori=ARBEID&steg=UTREDES");
  });

  it("viser prosenter med én desimal og humaniserer tekniske koder", () => {
    renderMedRouter((data) => ({
      ...data,
      statusfordeling: data.statusfordeling.map((status, index) =>
        index === 0 ? { ...status, navn: "STRAFFERETTSLIG_VURDERING" } : status,
      ),
    }));

    expect(screen.getByText("72,0 %")).toBeDefined();
    expect(screen.getByText("Strafferettslig vurdering")).toBeDefined();
  });

  it("formaterer beløp med mellomrom som tusenseparator", () => {
    renderMedRouter((data) => ({
      ...data,
      periodeTall: {
        ...data.periodeTall,
        antattBeløp: "1234567",
        vedtattBeløp: "9876543,21",
        anmeldtBeløp: "2,4 mill",
      },
    }));

    expect(screen.getByText("1 234 567")).toBeDefined();
    expect(screen.getByText("9 876 543,21")).toBeDefined();
    expect(screen.getByText("2,4 mill")).toBeDefined();
  });

  it("beregner totaler fra dataene i stedet for å bruke mocktall", () => {
    renderMedRouter((data) => ({
      ...data,
      kontrollrapport: [
        { navn: "KONTROLLNOTAT", verdi: 3, prosent: 60 },
        { navn: "POTENSIELL_STRAFFESAK", verdi: 2, prosent: 40 },
      ],
      henlagt: [
        { navn: "BEVISETS_STILLING", verdi: 4 },
        { navn: "FORELDET", verdi: 1 },
      ],
    }));

    expect(screen.getByText("Av 5 saker med kontrollrapport")).toBeDefined();
    expect(screen.getByText("Av totalt 5 henlagte saker")).toBeDefined();
    expect(screen.getByText("Kontrollnotat")).toBeDefined();
    expect(screen.getByRole("button", { name: /Bevisets stilling/ })).toBeDefined();
  });

  it("viser snitt dager for avsluttede saker når backend leverer det", () => {
    renderMedRouter((data) => ({
      ...data,
      periodeTall: { ...data.periodeTall, snittDagerAvsluttet: 41 },
    }));

    expect(screen.getByText("Snitt 41 dager")).toBeDefined();
  });

  it("faller tilbake til «i perioden» uten snitt for avsluttede saker", () => {
    renderMedRouter((data) => ({
      ...data,
      periodeTall: { ...data.periodeTall, snittDagerAvsluttet: null },
    }));

    expect(screen.queryByText(/^Snitt \d+ dager$/)).toBeNull();
    expect(screen.getAllByText("i perioden")).toHaveLength(2);
  });

  function tomPeriode(data: ReturnType<typeof lagMockStatistikk>) {
    return {
      ...data,
      periodeTall: {
        ...data.periodeTall,
        innkomne: 0,
        avsluttede: 0,
        antattBeløp: "0",
        vedtattBeløp: "0.00",
        anmeldtBeløp: "0",
      },
      statusfordeling: data.statusfordeling.map((status) => ({ ...status, verdi: 0, prosent: 0 })),
      kategorifordeling: data.kategorifordeling.map((kategori) => ({ ...kategori, verdi: 0 })),
      kontrollrapport: data.kontrollrapport.map((rad) => ({ ...rad, verdi: 0, prosent: 0 })),
      henlagt: data.henlagt.map((rad) => ({ ...rad, verdi: 0 })),
    };
  }

  it("viser infomelding i periodedelen når perioden ikke har hendelser", () => {
    renderMedRouter(tomPeriode);

    expect(screen.getByText("Ingen hendelser i valgt periode.")).toBeDefined();
    expect(screen.queryByText("Statusfordeling")).toBeNull();
    expect(screen.getByText("Øyeblikksbilde")).toBeDefined();
  });

  it.each([
    [
      "beløp",
      (data: ReturnType<typeof tomPeriode>) => ({
        ...data,
        periodeTall: { ...data.periodeTall, antattBeløp: "1000" },
      }),
    ],
    [
      "kategorier",
      (data: ReturnType<typeof tomPeriode>) => ({
        ...data,
        kategorifordeling: [{ navn: "SAMLIV", verdi: 1 }],
      }),
    ],
    [
      "kontrollrapport",
      (data: ReturnType<typeof tomPeriode>) => ({
        ...data,
        kontrollrapport: [{ navn: "POTENSIELL_STRAFFESAK", verdi: 1, prosent: 100 }],
      }),
    ],
    [
      "henlagt",
      (data: ReturnType<typeof tomPeriode>) => ({
        ...data,
        henlagt: [{ navn: "UTREDNING", verdi: 1 }],
      }),
    ],
  ])("viser periodedata når bare %s har verdier", (_, medData) => {
    renderMedRouter((data) => medData(tomPeriode(data)));

    expect(screen.queryByText("Ingen hendelser i valgt periode.")).toBeNull();
    expect(screen.getByText("Statusfordeling")).toBeDefined();
  });

  it("bruker entall når det er én sak", () => {
    renderMedRouter((data) => ({
      ...data,
      kategorifordeling: [{ navn: "SAMLIV", verdi: 1 }],
      kontrollrapport: [{ navn: "POTENSIELL_STRAFFESAK", verdi: 1, prosent: 100 }],
      henlagt: [{ navn: "UTREDNING", verdi: 1 }],
    }));

    expect(screen.getByText("Av 1 sak med kontrollrapport")).toBeDefined();
    expect(screen.getByText("Av totalt 1 henlagt sak")).toBeDefined();
    expect(screen.getAllByText("1 sak").length).toBeGreaterThanOrEqual(2);
  });

  it("viser lesbart navn for traktsteget TILDELT", () => {
    renderMedRouter((data) => ({
      ...data,
      statusfordeling: [{ navn: "TILDELT", filterverdi: "OPPRETTET", verdi: 3, prosent: 100 }],
    }));

    expect(screen.getByText("Tildelt")).toBeDefined();
  });

  it("skalerer aldersstolpene etter største bøtte", () => {
    renderMedRouter((data) => ({
      ...data,
      alderssammensetning: [
        { navn: "0-3", verdi: 200 },
        { navn: "3-6", verdi: 100 },
      ],
    }));

    const stolper = [...document.querySelectorAll<HTMLElement>("span.rounded-t-sm")];
    expect(stolper.map((stolpe) => stolpe.style.height)).toEqual(["82%", "41%"]);
  });

  it("viser lesbart navn for backendens stegkode UTREDNING", () => {
    renderMedRouter((data) => ({
      ...data,
      statusfordeling: [{ navn: "UTREDNING", filterverdi: "UTREDNING", verdi: 3, prosent: 100 }],
    }));

    expect(screen.getByText("Utredning")).toBeDefined();
  });

  it("gir statuslabels en egen wrappende layoutkolonne", () => {
    renderMedRouter((data) => ({
      ...data,
      statusfordeling: data.statusfordeling.map((status, index) =>
        index === 0 ? { ...status, navn: "STRAFFERETTSLIG_VURDERING" } : status,
      ),
    }));

    const statuslabel = screen.getByText("Strafferettslig vurdering");
    expect(statuslabel.className).toContain("break-words");
    expect(statuslabel.parentElement?.className).toContain(
      "grid-cols-[minmax(8rem,auto)_minmax(0,1fr)_auto]",
    );
  });
});
