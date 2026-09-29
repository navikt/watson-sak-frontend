import { describe, expect, it } from "vitest";
import type { DokumentNode, FilResponse } from "../typer";
import { byggFilTre, flatMappeliste, type FilTreNode, type MappeTreNode } from "./bygg-filtre";

function dokument(id: string, tittel: string, mappe?: string | null): DokumentNode {
  return {
    id,
    tittel,
    opprettetAv: "Ola",
    opprettetDato: "2026-01-01",
    endretAv: "Ola",
    endretDato: "2026-01-02",
    låsAv: null,
    mappe,
  };
}

function fil(id: string, filnavn: string, mappe?: string | null): FilResponse {
  return {
    id,
    filnavn,
    storrelse: 1,
    contentType: "application/pdf",
    opprettetAv: "Ola",
    opprettet: "2026-01-01T10:00:00Z",
    bruktIDokumenter: [],
    mappe,
  };
}

function navn(noder: FilTreNode[]): string[] {
  return noder.map((node) =>
    node.type === "mappe"
      ? `📁${node.navn}`
      : node.type === "dokument"
        ? node.dokument.tittel
        : node.fil.filnavn,
  );
}

function mappe(noder: FilTreNode[], navnPåMappe: string): MappeTreNode {
  const funnet = noder.find((node) => node.type === "mappe" && node.navn === navnPåMappe);
  if (!funnet || funnet.type !== "mappe") throw new Error(`Fant ikke mappen ${navnPåMappe}`);
  return funnet;
}

describe("byggFilTre", () => {
  it("legger mapper først og sorterer alt alfabetisk", () => {
    const tre = byggFilTre(
      ["Bank", "Arbeidsgiver"],
      [dokument("d1", "Vurdering"), dokument("d2", "Anmeldelse")],
      [fil("f1", "bilde.png")],
    );

    expect(navn(tre)).toEqual(["📁Arbeidsgiver", "📁Bank", "Anmeldelse", "bilde.png", "Vurdering"]);
  });

  it("nester undermapper og teller filer rekursivt", () => {
    const tre = byggFilTre(
      ["Bank", "Bank/2024", "Bank/2024/Kvittering"],
      [dokument("d1", "Notat", "Bank")],
      [fil("f1", "utskrift.pdf", "Bank/2024/Kvittering"), fil("f2", "annen.pdf", "Bank/2024")],
    );

    const bank = mappe(tre, "Bank");
    expect(bank.antallFiler).toBe(3);
    expect(navn(bank.barn)).toEqual(["📁2024", "Notat"]);

    const år = mappe(bank.barn, "2024");
    expect(år.antallFiler).toBe(2);
    expect(år.sti).toBe("Bank/2024");
    expect(mappe(år.barn, "Kvittering").antallFiler).toBe(1);
  });

  it("oppretter manglende mapper for elementer som peker på en ukjent mappe", () => {
    const tre = byggFilTre([], [dokument("d1", "Notat", "Ukjent/Under")], []);

    const ukjent = mappe(tre, "Ukjent");
    expect(mappe(ukjent.barn, "Under").barn).toHaveLength(1);
    expect(ukjent.antallFiler).toBe(1);
  });

  it("tar ikke med arkiverte dokumenter og filer", () => {
    const tre = byggFilTre(
      ["Bank"],
      [{ ...dokument("d1", "Arkivert", "Bank"), arkivert: "2026-01-03T10:00:00Z" }],
      [{ ...fil("f1", "arkivert.pdf"), arkivert: "2026-01-03T10:00:00Z" }],
    );

    expect(navn(tre)).toEqual(["📁Bank"]);
    expect(mappe(tre, "Bank").antallFiler).toBe(0);
  });

  it("sorterer tall naturlig", () => {
    const tre = byggFilTre(["Vedlegg 10", "Vedlegg 2"], [], []);
    expect(navn(tre)).toEqual(["📁Vedlegg 2", "📁Vedlegg 10"]);
  });
});

describe("flatMappeliste", () => {
  it("lister alle mapper dybde først", () => {
    const tre = byggFilTre(["B", "A", "A/Under"], [], []);
    expect(flatMappeliste(tre).map((node) => node.sti)).toEqual(["A", "A/Under", "B"]);
  });
});
