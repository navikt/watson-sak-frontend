import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { teksterForMappehandling } from "~/saker/filer/mapper/useMappehandling";
import { flytteFeil, INNSENDINGSFEIL, velgTekst } from "./feilmeldinger";
import { Innsendingsfeil } from "./Innsendingsfeil";

describe("velgTekst", () => {
  it("velger variant ut fra om vi vet at endringen ikke ble lagret", () => {
    expect(velgTekst(INNSENDINGSFEIL.endreSteg, false).tittel).toBe("Vi fikk ikke endret steget");
    expect(velgTekst(INNSENDINGSFEIL.endreSteg, true).tittel).toBe(
      "Vi vet ikke om steget ble endret",
    );
  });

  it("bruker samme tekst for begge når meldingen bare har én", () => {
    expect(velgTekst(INNSENDINGSFEIL.søk, true)).toEqual(velgTekst(INNSENDINGSFEIL.søk, false));
  });
});

describe("Innsendingsfeil", () => {
  it("viser «feilet» når backend sier sikkert at endringen ikke ble lagret", () => {
    render(
      <Innsendingsfeil
        svar={{ teknisk: true, feilId: "a1b2c3d4", usikker: false }}
        tekster={INNSENDINGSFEIL.delTilgang}
      />,
    );
    expect(screen.getByText("Vi fikk ikke delt tilgangen")).toBeDefined();
    expect(screen.getByText("Prøv igjen om litt.")).toBeDefined();
  });

  it("viser «vet ikke» når svaret mangler usikker, fordi det er det trygge valget", () => {
    render(
      <Innsendingsfeil
        svar={{ teknisk: true, feilId: "a1b2c3d4" }}
        tekster={INNSENDINGSFEIL.delTilgang}
      />,
    );
    expect(screen.getByText("Vi vet ikke om tilgangen ble delt")).toBeDefined();
  });

  it("viser ingenting når svaret ikke er en teknisk feil", () => {
    const { container } = render(
      <Innsendingsfeil
        svar={{ ok: false, feil: "Konflikt" }}
        tekster={INNSENDINGSFEIL.delTilgang}
      />,
    );
    expect(container.textContent).toBe("");
  });
});

describe("teksterForMappehandling", () => {
  it("skiller nytt navn fra flytting av mappe", () => {
    expect(teksterForMappehandling({ handling: "endre", fraSti: "Bank", tilSti: "Banken" })).toBe(
      INNSENDINGSFEIL.giMappeNyttNavn,
    );
    expect(
      teksterForMappehandling({ handling: "endre", fraSti: "Bank", tilSti: "Arkiv/Bank" }),
    ).toEqual(flytteFeil("Bank"));
  });

  it("bruker navnet på fila eller dokumentet som flyttes", () => {
    const tekster = teksterForMappehandling(
      { handling: "flytt-fil", id: "f1", mappe: "Arkiv" },
      "vedlegg.pdf",
    );
    expect(velgTekst(tekster, false).tittel).toBe("Vi fikk ikke flyttet «vedlegg.pdf»");
  });

  it("gir egne tekster for å opprette og slette mapper", () => {
    expect(teksterForMappehandling({ handling: "opprett", sti: "Ny" })).toBe(
      INNSENDINGSFEIL.opprettMappe,
    );
    expect(teksterForMappehandling({ handling: "slett", sti: "Ny" })).toBe(
      INNSENDINGSFEIL.slettMappe,
    );
  });
});
