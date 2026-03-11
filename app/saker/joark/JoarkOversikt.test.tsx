import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JoarkOversikt } from "./JoarkOversikt";
import type { Journalpost } from "./typer";

function lagJournalpost(overrides: Partial<Journalpost> = {}): Journalpost {
  return {
    journalpostId: "1001",
    tittel: "Søknad om dagpenger",
    dato: "2026-03-01",
    journalposttype: "inngående",
    tema: "Dagpenger",
    avsenderMottaker: "Bruker",
    dokumentUrl: "https://joark.intern.nav.no/dokument/1001",
    ...overrides,
  };
}

function lagFlereJournalposter(antall: number): Journalpost[] {
  return Array.from({ length: antall }, (_, i) =>
    lagJournalpost({
      journalpostId: `${1001 + i}`,
      tittel: `Dokument ${i + 1}`,
      dato: `2026-${String(1 + (i % 12)).padStart(2, "0")}-${String(1 + (i % 28)).padStart(2, "0")}`,
      journalposttype: (["inngående", "utgående", "notat"] as const)[i % 3],
      tema: ["Dagpenger", "Sykepenger", "Foreldrepenger"][i % 3],
      avsenderMottaker: ["Bruker", "Fastlege", "NAV Kontroll"][i % 3],
      dokumentUrl: `https://joark.intern.nav.no/dokument/${1001 + i}`,
    }),
  );
}

describe("JoarkOversikt", () => {
  it("viser tom tilstand når det ikke er noen journalposter", () => {
    render(<JoarkOversikt journalposter={[]} />);
    expect(screen.getByText("Ingen journalføringer funnet i Joark.")).toBeDefined();
  });

  it("viser heading 'Journalføringer' alltid", () => {
    render(<JoarkOversikt journalposter={[]} />);
    expect(screen.getByText("Journalføringer")).toBeDefined();
  });

  it("viser tabell med korrekte kolonner", () => {
    const poster = [lagJournalpost()];
    render(<JoarkOversikt journalposter={poster} />);

    expect(screen.getByText("Tittel")).toBeDefined();
    expect(screen.getByText("Dato")).toBeDefined();
    expect(screen.getByText("Type")).toBeDefined();
    expect(screen.getByText("Tema")).toBeDefined();
    expect(screen.getByText("Avsender/mottaker")).toBeDefined();
  });

  it("viser journalpostdata i tabellen", () => {
    const poster = [lagJournalpost()];
    render(<JoarkOversikt journalposter={poster} />);

    expect(screen.getByText("Søknad om dagpenger")).toBeDefined();
    expect(screen.getByText("Dagpenger")).toBeDefined();
    expect(screen.getByText("Bruker")).toBeDefined();
    expect(screen.getByText("inngående")).toBeDefined();
  });

  it("viser lenke som åpner i ny fane", () => {
    const poster = [lagJournalpost()];
    render(<JoarkOversikt journalposter={poster} />);

    const lenke = screen.getByText("Søknad om dagpenger").closest("a")!;
    expect(lenke.getAttribute("href")).toBe("https://joark.intern.nav.no/dokument/1001");
    expect(lenke.getAttribute("target")).toBe("_blank");
    expect(lenke.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("viser ikke søk og paginering når det er 10 eller færre entries", () => {
    const poster = lagFlereJournalposter(10);
    render(<JoarkOversikt journalposter={poster} />);

    expect(screen.queryByLabelText("Søk i journalposter")).toBeNull();
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("viser søk og paginering når det er mer enn 10 entries", () => {
    const poster = lagFlereJournalposter(15);
    render(<JoarkOversikt journalposter={poster} />);

    expect(screen.getByLabelText("Søk i journalposter")).toBeDefined();
    expect(screen.getByRole("navigation")).toBeDefined();
  });

  it("viser antall journalposter når det er mer enn 10", () => {
    const poster = lagFlereJournalposter(15);
    render(<JoarkOversikt journalposter={poster} />);

    expect(screen.getByText("15 journalposter")).toBeDefined();
  });

  it("viser entallsform for én journalpost etter filtrering", () => {
    const poster = lagFlereJournalposter(15);
    render(<JoarkOversikt journalposter={poster} />);

    const søkefelt = screen.getByLabelText("Søk i journalposter");
    fireEvent.change(søkefelt, { target: { value: "Dokument 1" } });

    // "Dokument 1" matcher "Dokument 1", "Dokument 10", "Dokument 11", osv.
    // Men for nøyaktig én match kan vi bruke en unik verdi
    fireEvent.change(søkefelt, { target: { value: "Dokument 5" } });
    expect(screen.getByText("1 journalpost")).toBeDefined();
  });

  it("filtrerer journalposter ved søk", () => {
    const poster = [
      lagJournalpost({ journalpostId: "1", tittel: "Søknad om dagpenger" }),
      lagJournalpost({ journalpostId: "2", tittel: "Vedtak om avslag" }),
      lagJournalpost({ journalpostId: "3", tittel: "Klage på vedtak" }),
    ];
    render(<JoarkOversikt journalposter={poster} />);

    // Alle tre er synlige (≤10, ingen søkefelt – men søk brukes bare med >10)
    // For å teste søk, trenger vi >10 poster
    const mangePoster = [
      ...lagFlereJournalposter(10),
      lagJournalpost({ journalpostId: "unique", tittel: "Unik spesialtittel" }),
    ];
    const { unmount } = render(<JoarkOversikt journalposter={mangePoster} />);

    const søkefelt = screen.getAllByLabelText("Søk i journalposter")[0];
    fireEvent.change(søkefelt, { target: { value: "Unik spesialtittel" } });

    expect(screen.getByText("Unik spesialtittel")).toBeDefined();
    expect(screen.queryByText("Dokument 1")).toBeNull();

    unmount();
  });

  it("søker også på tema og avsender/mottaker", () => {
    const poster = [
      ...lagFlereJournalposter(10),
      lagJournalpost({
        journalpostId: "unique",
        tittel: "Vanlig tittel",
        tema: "Spesialttema",
        avsenderMottaker: "Spesialavdeling",
      }),
    ];

    const { rerender } = render(<JoarkOversikt journalposter={poster} />);

    const søkefelt = screen.getByLabelText("Søk i journalposter");

    fireEvent.change(søkefelt, { target: { value: "Spesialttema" } });
    expect(screen.getByText("Vanlig tittel")).toBeDefined();

    fireEvent.change(søkefelt, { target: { value: "Spesialavdeling" } });
    expect(screen.getByText("Vanlig tittel")).toBeDefined();
  });

  it("viser melding når søk gir ingen treff", () => {
    const poster = lagFlereJournalposter(15);
    render(<JoarkOversikt journalposter={poster} />);

    const søkefelt = screen.getByLabelText("Søk i journalposter");
    fireEvent.change(søkefelt, { target: { value: "finnes-ikke-xyz" } });

    expect(screen.getByText("Ingen journalposter samsvarer med søket.")).toBeDefined();
  });

  it("paginerer korrekt med 10 poster per side", () => {
    const poster = lagFlereJournalposter(15);
    render(<JoarkOversikt journalposter={poster} />);

    // Første side: 10 poster
    const rader = screen.getAllByRole("row");
    // 1 header-rad + 10 data-rader = 11
    expect(rader.length).toBe(11);
  });

  it("resetter paginering ved søk", () => {
    const poster = lagFlereJournalposter(25);
    render(<JoarkOversikt journalposter={poster} />);

    // Gå til side 2
    const side2Knapp = screen.getByText("2");
    fireEvent.click(side2Knapp);

    // Søk – skal resette til side 1
    const søkefelt = screen.getByLabelText("Søk i journalposter");
    fireEvent.change(søkefelt, { target: { value: "Dokument" } });

    // Side 1 skal være aktiv (aria-current)
    const side1Knapp = screen.getByText("1");
    expect(side1Knapp.closest("[aria-current]")).not.toBeNull();
  });
});
