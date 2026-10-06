import { fireEvent, render, screen, within } from "@testing-library/react";
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
      {
        path: "/",
        element: <StatistikkDiagrammer data={data} periodevelger={<button>Velg periode</button>} />,
      },
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
    expect(screen.getByText("Sakstype fordelt på steg")).toBeDefined();
    expect(screen.getByRole("heading", { name: "Saksflyt" })).toBeDefined();
    expect(screen.queryByText("Statusfordeling")).toBeNull();
    expect(screen.getByText("Sakskategorifordeling")).toBeDefined();
  });

  it("lar brukeren skjule et steg i stablede stolper", () => {
    renderMedRouter();

    fireEvent.click(screen.getByRole("button", { name: "Utredning" }));
    expect(screen.getByRole("button", { name: "Utredning" }).className).toContain("line-through");
  });

  it("lenker et segment til støttede kategori- og stegfiltre", () => {
    renderMedRouter();

    const lenke = screen.getByRole("link", { name: /Arbeid, Utredning/ });
    expect(lenke.getAttribute("href")).toBe("/alle-saker?kategori=ARBEID&steg=UTREDNING");
  });

  it("viser prosenter med én desimal og humaniserer tekniske koder", () => {
    renderMedRouter((data) => ({
      ...data,
      statusfordeling: data.statusfordeling.map((status) =>
        status.filterverdi === "STRAFFERETTSLIG_VURDERING"
          ? { ...status, navn: "STRAFFERETTSLIG_VURDERING" }
          : status,
      ),
    }));

    expect(screen.getByText("72,0 %")).toBeDefined();
    expect(screen.getByText("Strafferettslig vurdert")).toBeDefined();
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

  it("viser tomtilstand i periodedelen uten å skjule øyeblikksbildet", () => {
    renderMedRouter(tomPeriode);

    expect(screen.getByRole("heading", { name: "Ingen statistikk å vise" })).toBeDefined();
    expect(screen.queryByText("Saksflyt")).toBeNull();
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

    expect(screen.queryByRole("heading", { name: "Ingen statistikk å vise" })).toBeNull();
    expect(screen.getByText("Saksflyt")).toBeDefined();
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

  it("viser Opprettet og riktig stegfilter i saksflyten", () => {
    renderMedRouter((data) => ({
      ...data,
      statusfordeling: [{ navn: "OPPRETTET", filterverdi: "OPPRETTET", verdi: 3, prosent: 100 }],
    }));

    const saksflyt = within(screen.getByRole("region", { name: "Saksflyt" }));
    expect(saksflyt.getByText("Opprettet")).toBeDefined();
    expect(saksflyt.queryByText("Tildelt")).toBeNull();
    expect(saksflyt.getByRole("link", { name: "Opprettet: 3 saker" }).getAttribute("href")).toBe(
      "/alle-saker?steg=OPPRETTET",
    );
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

    expect(screen.getByText("Utredet")).toBeDefined();
  });

  it("gir lange stegnavn en bredere layoutkolonne", () => {
    renderMedRouter((data) => ({
      ...data,
      statusfordeling: data.statusfordeling.map((status) =>
        status.filterverdi === "STRAFFERETTSLIG_VURDERING"
          ? { ...status, navn: "STRAFFERETTSLIG_VURDERING" }
          : status,
      ),
    }));

    const statuslabel = screen.getByText("Strafferettslig vurdert");
    expect(statuslabel.className).not.toContain("truncate");
    expect(statuslabel.parentElement?.getAttribute("style")).toContain(
      "minmax(0, 14rem) minmax(0, 1fr)",
    );
  });

  it("fjerner bare Henlagt fra saksflyten og beholder henleggelsesgrunnene", () => {
    renderMedRouter();

    const saksflyt = within(screen.getByRole("region", { name: "Saksflyt" }));
    expect(saksflyt.queryByText("Henlagt")).toBeNull();
    expect(saksflyt.getAllByRole("link")).toHaveLength(5);
    expect(screen.getByRole("heading", { name: "Henlagt – fordelt på grunn" })).toBeDefined();
  });

  it("lenker saksflyten til riktig steg og sentrerer stolpene", () => {
    renderMedRouter();

    const saksflyt = within(screen.getByRole("region", { name: "Saksflyt" }));
    const utredet = saksflyt.getByRole("link", { name: "Utredet: 234 saker, 72,0 %" });
    expect(utredet.getAttribute("href")).toBe("/alle-saker?steg=UTREDNING");
    expect(utredet.getAttribute("style")).toContain("72%");
    expect(utredet.getAttribute("style")).toContain("auto");
  });

  it("viser null uten stolpebakgrunn eller lenke", () => {
    renderMedRouter((data) => ({
      ...data,
      statusfordeling: [
        { navn: "OPPRETTET", filterverdi: "OPPRETTET", verdi: 0, prosent: 0 },
        { navn: "UTREDNING", filterverdi: "UTREDNING", verdi: 1, prosent: 100 },
      ],
    }));

    const saksflyt = within(screen.getByRole("region", { name: "Saksflyt" }));
    expect(saksflyt.getByText("0")).toBeDefined();
    expect(saksflyt.getByText("0,0 %")).toBeDefined();
    expect(saksflyt.queryByRole("link", { name: /Opprettet/ })).toBeNull();
    expect(saksflyt.getByText("0").parentElement?.getAttribute("style")).not.toContain(
      "background",
    );
  });

  it("skjuler prosentteksten for alle trinn på 100 prosent", () => {
    renderMedRouter((data) => ({
      ...data,
      statusfordeling: [
        { navn: "OPPRETTET", filterverdi: "OPPRETTET", verdi: 3, prosent: 100 },
        { navn: "UTREDNING", filterverdi: "UTREDNING", verdi: 3, prosent: 100 },
        { navn: "POLITI", filterverdi: "POLITI", verdi: 1, prosent: 100 / 3 },
      ],
    }));

    const saksflyt = within(screen.getByRole("region", { name: "Saksflyt" }));
    expect(saksflyt.queryByText("100,0 %")).toBeNull();
    expect(saksflyt.getByRole("link", { name: "Opprettet: 3 saker" })).toBeDefined();
    expect(saksflyt.getByRole("link", { name: "Utredet: 3 saker" })).toBeDefined();
    expect(saksflyt.getAllByText("3")).toHaveLength(2);
    expect(saksflyt.getByRole("link", { name: "Politiet: 1 sak, 33,3 %" })).toBeDefined();
    expect(saksflyt.getByText("33,3 %")).toBeDefined();
  });

  it("viser en egen tomtilstand når alle verdier er null, selv med utfylte dataserier", () => {
    renderMedRouter((data) => ({
      ...tomPeriode(data),
      varsler: [],
      nøkkeltall: data.nøkkeltall.map((tall) => ({ ...tall, verdi: "0" })),
      sakstyper: data.sakstyper.map((rad) => ({
        ...rad,
        deler: rad.deler.map((del) => ({ ...del, verdi: 0 })),
      })),
      alderssammensetning: data.alderssammensetning.map((rad) => ({ ...rad, verdi: 0 })),
    }));

    expect(screen.getByRole("heading", { name: "Ingen statistikk å vise" })).toBeDefined();
    expect(
      screen.getByText("Det finnes ingen informasjon for utvalget og tidsperioden du har valgt."),
    ).toBeDefined();
    expect(screen.queryByText("Øyeblikksbilde")).toBeNull();
    expect(screen.queryByText("Sakstype fordelt på steg")).toBeNull();
    expect(screen.getByRole("button", { name: "Velg periode" })).toBeDefined();
  });

  it("viser tomtilstand også når dataseriene er tomme", () => {
    renderMedRouter((data) => ({
      ...tomPeriode(data),
      varsler: [],
      nøkkeltall: [],
      sakstyper: [],
      alderssammensetning: [],
      statusfordeling: [],
      kategorifordeling: [],
      kontrollrapport: [],
      henlagt: [],
    }));

    expect(screen.getByRole("heading", { name: "Ingen statistikk å vise" })).toBeDefined();
    expect(screen.queryByText("Øyeblikksbilde")).toBeNull();
  });

  it("viser periodedata selv uten nøkkeltall", () => {
    renderMedRouter((data) => ({
      ...data,
      nøkkeltall: [],
      sakstyper: [],
      alderssammensetning: [],
      varsler: [],
    }));

    expect(screen.getByRole("heading", { name: "Saksflyt" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Ingen statistikk å vise" })).toBeNull();
  });
});
