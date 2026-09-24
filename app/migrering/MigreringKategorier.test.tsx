import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createRoutesStub } from "react-router";
import { MigreringInnhold } from "./MigreringInnhold";
import { hentMockMigreringKandidater } from "./mock-data.server";
import type { MigreringLister } from "./types";

const kandidater = hentMockMigreringKandidater("L999999");
const lister: MigreringLister = {
  mine: kandidater.filter((k) => k.ansvar.type === "BEKREFTET"),
  utenBekreftetAnsvarlig: kandidater.filter((k) => k.ansvar.type !== "BEKREFTET"),
};

function renderSide() {
  const Stub = createRoutesStub([
    {
      path: "/migrering",
      Component: () => <MigreringInnhold lister={lister} />,
    },
    {
      path: "/api/registrer-sak/forhåndsutfyll",
      action: () => null,
    },
  ]);
  return render(<Stub initialEntries={["/migrering"]} />);
}

/**
 * Kategoriene (§ 1 i kontrakten) og MINE/UTEN_ANSVARLIG-skillet (§ 4) finnes
 * fortsatt i datamodellen og API-et, men er ikke del av selve listeskjermen
 * etter at UI-et ble bygget om til å matche Figma («1. Migrering – liste»,
 * docs/migrering.jpeg). De seks kategori-fanene som tidligere fantes her er
 * fjernet — se MigreringInnhold.test.tsx for gjeldende oppførsel.
 */
describe("MigreringInnhold – kontraktskrav som overlever UI-forenklingen", () => {
  it("viser synlig etikett for arbeidsgiveranmeldelse (ekskluderFraStatistikk) i grunnlagsmodalen", () => {
    renderSide();

    fireEvent.click(screen.getByRole("button", { name: "Se grunnlag for PID 100502" }));
    const dialog = screen.getByRole("dialog");

    expect(within(dialog).getByText("Arbeidsgiver Anmeldt Eksempel")).not.toBeNull();
    expect(
      within(dialog).getByText("Arbeidsgiveranmeldelse – holdes utenfor statistikk"),
    ).not.toBeNull();
  });

  it("dekker alle seks kategorier i det underliggende datagrunnlaget, selv om de ikke vises som faner", () => {
    const alleKategorier = new Set(kandidater.map((k) => k.kategori));
    expect(alleKategorier.size).toBe(6);
  });
});
