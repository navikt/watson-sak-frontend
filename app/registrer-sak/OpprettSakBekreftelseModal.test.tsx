import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { OpprettSakBekreftelseModal, byggOpprettSakSammendrag } from "./OpprettSakBekreftelseModal";

const fetcherState = vi.hoisted(() => ({
  state: "idle" as "idle" | "submitting",
  data: undefined as { ok: boolean } | undefined,
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useFetcher: () => ({
      Form: actual.Form,
      state: fetcherState.state,
      data: fetcherState.data,
      submit: vi.fn(),
    }),
  };
});

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

function renderModal(props: ComponentProps<typeof OpprettSakBekreftelseModal>) {
  const router = createMemoryRouter([
    { path: "/", Component: () => <OpprettSakBekreftelseModal {...props} /> },
  ]);
  return render(<RouterProvider router={router} />);
}

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

  it("viser notat-feilvarsel og prøv-igjen-knapp på suksesssteget når notatlagring feilet", () => {
    fetcherState.state = "idle";
    fetcherState.data = undefined;
    renderModal({
      steg: "suksess",
      åpen: true,
      onClose: vi.fn(),
      personNavn: "Ola Testesen",
      personnummer: "12345678901",
      alder: 30,
      sammendrag: tomtSammendrag,
      senderInn: false,
      onBekreft: vi.fn(),
      onAvbryt: vi.fn(),
      sakId: "12345",
      onOpprettNySak: vi.fn(),
      notatFeil: true,
      notatTekst: "Internt notat om saken.",
    });

    expect(screen.getByText("Saken ble opprettet, men notatet kunne ikke lagres.")).toBeDefined();
    expect(screen.getByRole("button", { name: "Prøv å lagre notatet igjen" })).toBeDefined();
  });

  it("viser ingen feilvarsel når notatet ble lagret", () => {
    renderModal({
      steg: "suksess",
      åpen: true,
      onClose: vi.fn(),
      personNavn: "Ola Testesen",
      personnummer: "12345678901",
      alder: 30,
      sammendrag: tomtSammendrag,
      senderInn: false,
      onBekreft: vi.fn(),
      onAvbryt: vi.fn(),
      sakId: "12345",
      onOpprettNySak: vi.fn(),
    });

    expect(screen.queryByText("Saken ble opprettet, men notatet kunne ikke lagres.")).toBeNull();
  });
});
