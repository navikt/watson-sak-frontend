import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OpprettSakBekreftelseModal, byggOpprettSakSammendrag } from "./OpprettSakBekreftelseModal";

const kodeverk = {
  merker: [],
  kategorier: [{ kode: "KATEGORI", beskrivelse: "Kategori" }],
  misbrukstyper: [],
  ytelseTyper: [],
  kilder: [{ kode: "KILDE", beskrivelse: "Kilde" }],
  enheter: [{ kode: "ENHET", beskrivelse: "Enhet" }],
};

const tomtSammendrag = {
  kategoriLabel: "Kategori",
  kildeLabel: "Kilde",
  enhetLabel: "Enhet",
  misbrukstypeLabels: [],
  orgnumre: [],
  ytelser: [],
  vedlegg: [],
};

describe("OpprettSakBekreftelseModal", () => {
  it("henter filnavn fra opplastede filer i sammendraget", () => {
    const formData = new FormData();
    formData.set("kategori", "KATEGORI");
    formData.set("kilde", "KILDE");
    formData.set("enhet", "ENHET");
    formData.append("filer", new File(["innhold"], "rapport.pdf"));

    expect(byggOpprettSakSammendrag(formData, kodeverk, new Map(), new Map()).vedlegg).toEqual([
      "rapport.pdf",
    ]);
  });

  it("viser punktliste med vedlegg eller Ingen", () => {
    const { rerender } = render(
      <OpprettSakBekreftelseModal
        steg="bekreft"
        åpen
        onClose={vi.fn()}
        personNavn="Ola Testesen"
        personnummer="12345678901"
        alder={30}
        sammendrag={{ ...tomtSammendrag, vedlegg: ["rapport.pdf", "bilde.png"] }}
        senderInn={false}
        onBekreft={vi.fn()}
        onAvbryt={vi.fn()}
        sakId={null}
        onOpprettNySak={vi.fn()}
      />,
    );

    expect(screen.getByText("rapport.pdf")).toBeDefined();
    expect(screen.getByText("bilde.png")).toBeDefined();

    rerender(
      <OpprettSakBekreftelseModal
        steg="bekreft"
        åpen
        onClose={vi.fn()}
        personNavn="Ola Testesen"
        personnummer="12345678901"
        alder={30}
        sammendrag={tomtSammendrag}
        senderInn={false}
        onBekreft={vi.fn()}
        onAvbryt={vi.fn()}
        sakId={null}
        onOpprettNySak={vi.fn()}
      />,
    );

    expect(screen.getByText("Ingen")).toBeDefined();
  });
});
