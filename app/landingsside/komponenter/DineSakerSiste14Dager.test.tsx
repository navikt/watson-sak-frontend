import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DineSakerSiste14Dager } from "./DineSakerSiste14Dager";

describe("DineSakerSiste14Dager", () => {
  it("viser nøkkeltall og skjuler valgfrie KPI-er når de er null", () => {
    render(
        <DineSakerSiste14Dager
          statistikk={{
            antallSakerJobbetMed: 6,
            antallTipsTilVurdering: 0,
            antallSendtTilNayNfp: 0,
            snittBehandlingstidPerSak: 4,
            antallHenlagteSaker: 2,
          antallHenlagteTips: 1,
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Dine saker siste 14 dager" })).toBeDefined();
    expect(screen.getByText("Behandlet")).toBeDefined();
    expect(screen.getByText("6")).toBeDefined();
    expect(screen.getByText("Dager behandlingstid, snitt")).toBeDefined();
    expect(screen.getByText("4")).toBeDefined();
    expect(screen.getByText("Henlagte saker")).toBeDefined();
    expect(screen.getByText("Henlagte tips")).toBeDefined();
    expect(screen.queryByText("Tips til vurdering")).toBeNull();
    expect(screen.queryByText("Sendt til NAY/NFP")).toBeNull();
  });
});
