import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { SaksflytModal, type SaksflytStart } from "./SaksflytModal";
import { dagpengerId, lagTillatteHandlinger, lagYtelse } from "./testdata";

const submitMock = vi.fn();
let mockSvar: unknown;

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");
  const react = await import("react");
  return {
    ...actual,
    useFetcher: () => {
      const [data, setData] = react.useState<unknown>(undefined);
      return {
        state: "idle",
        submit: (formData: FormData, opts: unknown) => {
          submitMock(formData, opts);
          setData(mockSvar);
        },
        data,
      };
    },
  };
});

function renderModal(sak: Partial<KontrollsakResponse> = {}, start: SaksflytStart = "meny") {
  const onClose = vi.fn();
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <SaksflytModal
            sakId="101"
            tillatteHandlinger={lagTillatteHandlinger(sak)}
            start={start}
            onClose={onClose}
          />
        ),
      },
    ],
    { initialEntries: ["/"] },
  );
  render(<RouterProvider router={router} />);
  return { onClose };
}

function sendtSkjema(): Record<string, FormDataEntryValue> {
  expect(submitMock).toHaveBeenCalledTimes(1);
  return Object.fromEntries(submitMock.mock.calls[0][0] as FormData);
}

function klikk(navn: string) {
  fireEvent.click(screen.getByRole("button", { name: navn }));
}

describe("SaksflytModal", () => {
  beforeEach(() => {
    submitMock.mockClear();
    mockSvar = { ok: true };
  });

  afterEach(cleanup);

  it("viser handlingene for steget i seksjonene Steg og Resultat", async () => {
    renderModal();
    const dialog = await screen.findByRole("dialog", {
      name: "Endre steg eller registrer resultat",
    });
    const steg = within(dialog).getByRole("region", { name: "Steg" });
    const resultat = within(dialog).getByRole("region", { name: "Resultat" });
    expect(within(steg).getByRole("button", { name: "Send til forvaltning" })).toBeDefined();
    expect(
      within(resultat)
        .getAllByRole("button")
        .map((knapp) => knapp.textContent),
    ).toEqual(["Henlegg sak"]);
  });

  it("flytter saken direkte når handlingen ikke har trinn", async () => {
    renderModal({ steg: "OPPRETTET", status: null });
    klikk("Gå til utredning");
    expect(await screen.findByText("Lagret")).toBeDefined();
    expect(sendtSkjema()).toEqual({
      handling: "endre_steg_dialog",
      versjon: "1",
      steg: "UTREDNING",
      registrerResultat: "false",
    });
  });

  it("henlegger med årsak og advarer før saken avsluttes", async () => {
    renderModal();
    klikk("Henlegg sak");
    expect(await screen.findByRole("dialog", { name: "Henlegg sak" })).toBeDefined();

    klikk("Henlegg og avslutt sak");
    expect(screen.getByText("Velg henleggelsesårsak")).toBeDefined();

    fireEvent.click(screen.getByRole("radio", { name: "Ikke kapasitet" }));
    klikk("Henlegg og avslutt sak");
    expect(await screen.findByRole("dialog", { name: "Avslutt sak" })).toBeDefined();
    expect(screen.getByText("Tilgang til dokumenter og underlag")).toBeDefined();
    expect(submitMock).not.toHaveBeenCalled();

    klikk("Avslutt sak");
    expect(await screen.findByText("Lagret")).toBeDefined();
    expect(sendtSkjema()).toMatchObject({
      steg: "AVSLUTTET",
      registrerResultat: "true",
      "resultat.utredning.type": "HENLAGT",
      "resultat.utredning.henleggelsesarsak": "IKKE_KAPASITET",
    });
  });

  it("velger henleggelsesårsak fra combobox i strafferettslig vurdering", async () => {
    renderModal({ steg: "STRAFFERETTSLIG_VURDERING" });
    klikk("Henlegg sak");
    await screen.findByRole("dialog", { name: "Henlegg sak" });

    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    const combobox = screen.getByRole("combobox", { name: /Henleggelsesårsak/ });
    fireEvent.focus(combobox);
    fireEvent.change(combobox, { target: { value: "NFP: Gammel" } });
    fireEvent.pointerUp(await screen.findByRole("option", { name: "NFP: Gammel sak" }));
    klikk("Henlegg og avslutt sak");
    await screen.findByRole("dialog", { name: "Avslutt sak" });

    klikk("Avslutt sak");
    expect(await screen.findByText("Lagret")).toBeDefined();
    expect(sendtSkjema()).toMatchObject({
      steg: "AVSLUTTET",
      "resultat.strafferettsligVurdering.type": "HENLAGT",
      "resultat.strafferettsligVurdering.henleggelsesarsak": "NFP_GAMMEL_SAK",
    });
  });

  it("går tilbake til menyen fra første trinn", async () => {
    renderModal();
    klikk("Henlegg sak");
    await screen.findByRole("dialog", { name: "Henlegg sak" });
    klikk("Tilbake");
    expect(
      await screen.findByRole("dialog", { name: "Endre steg eller registrer resultat" }),
    ).toBeDefined();
  });

  it("lukker modalen fra advarselen før avslutning", async () => {
    const { onClose } = renderModal({ steg: "FORVALTNING", status: "VENTER_PA_VEDTAK" });
    klikk("Henlegg sak");
    await screen.findByRole("dialog", { name: "Avslutt sak" });
    klikk("Tilbake til saksbildet");
    expect(onClose).toHaveBeenCalled();
    expect(submitMock).not.toHaveBeenCalled();
  });

  it("krever beløp og full sjekkliste før saken sendes til forvaltning", async () => {
    renderModal();
    klikk("Send til forvaltning");
    await screen.findByRole("dialog", { name: "Send til forvaltning" });
    expect(screen.queryByRole("radio", { name: "Kontrollnotat" })).toBeNull();

    klikk("Neste");
    expect(screen.getByText("Resultat fra utredningen må fylles ut")).toBeDefined();
    expect(screen.getByText("Fyll inn beløp")).toBeDefined();

    fireEvent.click(screen.getByRole("radio", { name: "Feilutbetalingssak, ordinær" }));
    const antattBelop = screen.getByLabelText("Antatt beløp (kr)");
    fireEvent.change(antattBelop, { target: { value: "12000" } });
    expect(antattBelop).toHaveProperty("value", "12 000");
    klikk("Neste");

    expect(
      await screen.findByRole("dialog", {
        name: "Sjekkliste",
      }),
    ).toBeDefined();
    expect(
      screen.getByText("Disse handlingene må være fullført før saken kan sendes til forvaltning."),
    ).toBeDefined();
    klikk("Alt OK - gå til forvaltning");
    expect(screen.getByText("Alle punktene må være fullført før du kan gå videre")).toBeDefined();

    for (const punkt of screen.getAllByRole("checkbox")) fireEvent.click(punkt);
    klikk("Alt OK - gå til forvaltning");

    expect(await screen.findByText("Lagret")).toBeDefined();
    expect(sendtSkjema()).toMatchObject({
      steg: "FORVALTNING",
      "resultat.utredning.type": "FEILUTBETALINGSSAK_ORDINAER",
      [`ytelse.${dagpengerId}.belop`]: "12000",
    });
  });

  it("velger politidistrikt fra en nedtrekksliste før saken går til politiet", async () => {
    renderModal({ steg: "STRAFFERETTSLIG_VURDERING" });
    klikk("Gå til politiet");
    await screen.findByRole("dialog", { name: "Registrer beløp som skal anmeldes" });
    expect(screen.getAllByLabelText(/\(kr\)/)).toHaveLength(1);
    klikk("Gå til politiet");
    expect(screen.getByText("Anmeldt beløp må fylles ut")).toBeDefined();
    expect(screen.getByText("Politidistrikt må fylles ut")).toBeDefined();
    fireEvent.change(screen.getByLabelText("Anmeldt beløp (kr)"), {
      target: { value: "45000" },
    });
    const politidistrikt = screen.getByRole("combobox", { name: "Politidistrikt" });
    expect(
      Array.from((politidistrikt as HTMLSelectElement).options).map((valg) => valg.value),
    ).toEqual([
      "",
      "Agder politidistrikt",
      "Finnmark politidistrikt",
      "Innlandet politidistrikt",
      "Kripos",
      "Møre og Romsdal politidistrikt",
      "Nordland politidistrikt",
      "Oslo politidistrikt",
      "Sør-Vest politidistrikt",
      "Sør-Øst politidistrikt",
      "Troms politidistrikt",
      "Trøndelag politidistrikt",
      "Vest politidistrikt",
      "Økokrim",
      "Øst politidistrikt",
    ]);
    fireEvent.change(politidistrikt, { target: { value: "Øst politidistrikt" } });
    klikk("Gå til politiet");

    expect(await screen.findByText("Lagret")).toBeDefined();
    expect(sendtSkjema()).toMatchObject({
      steg: "POLITI",
      "resultat.strafferettsligVurdering.type": "ANMELDT",
      "resultat.strafferettsligVurdering.anmeldtBelop": "45000",
      "resultat.strafferettsligVurdering.politidistrikt": "Øst politidistrikt",
    });
  });

  it("fyller inn antatt beløp og lar endelig og tilbakekrevd beløp være valgfrie", async () => {
    renderModal({
      steg: "FORVALTNING",
      status: "VENTER_PA_VEDTAK",
      ytelser: [lagYtelse({ belop: 12000 })],
    });
    klikk("Registrer feilutbetaling");
    const endelig = await screen.findByLabelText("Beløp som er feilutbetalt (kr) (valgfritt)");
    expect(endelig).toHaveProperty("value", "12 000");
    fireEvent.change(endelig, { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Tilbakekrevd beløp (kr) (valgfritt)"), {
      target: { value: "8000" },
    });
    klikk("Registrer feilutbetaling og avslutt saken");
    await screen.findByRole("dialog", { name: "Avslutt sak" });
    klikk("Avslutt sak");

    expect(await screen.findByText("Lagret")).toBeDefined();
    const sendt = sendtSkjema();
    expect(sendt).toMatchObject({
      steg: "AVSLUTTET",
      "resultat.forvaltning.tilbakekrevdBelop": "8000",
    });
    expect(sendt).not.toHaveProperty(`ytelse.${dagpengerId}.endeligBelop`);
  });

  it("registrerer domfellelse og avslutter saken", async () => {
    renderModal({ steg: "POLITI", status: "VENTER_PA_RESULTAT" });
    klikk("Registrer resultat");
    await screen.findByRole("dialog", { name: "Registrer resultat" });
    expect(screen.getByRole("group", { name: "Politiet" })).toBeDefined();
    expect(screen.getByRole("group", { name: "Domstolen" })).toBeDefined();
    expect(screen.queryByRole("radio", { name: "Bot" })).toBeNull();
    const radionavn = screen.getAllByRole("radio").map((radio) => radio.getAttribute("name"));
    expect(new Set(radionavn).size).toBe(1);
    klikk("Neste");
    expect(screen.getByText("Velg resultat")).toBeDefined();
    fireEvent.click(screen.getByRole("radio", { name: "Domfelt" }));
    klikk("Neste");

    expect(await screen.findByRole("heading", { name: "Domfelt" })).toBeDefined();
    expect(screen.getByText("Tilgang til dokumenter og underlag")).toBeDefined();
    expect(
      within(screen.getByRole("radiogroup", { name: "Tilståelsesdom (påkrevd)" })).getByRole(
        "radio",
        {
          name: "Nei",
        },
      ),
    ).toHaveProperty("checked", true);
    expect(screen.getByRole("radiogroup", { name: "Medvirker? (påkrevd)" })).toBeDefined();
    expect(screen.getByRole("radiogroup", { name: /Strafferabatt\? \(påkrevd\)/ })).toBeDefined();
    expect(screen.queryByRole("radiogroup", { name: /Brudd på EMK art\. 6\?/ })).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Liggetid hos Nav" }));
    expect(
      screen.getByRole("radiogroup", { name: "Brudd på EMK art. 6? (påkrevd)" }),
    ).toBeDefined();
    fireEvent.click(screen.getByRole("radio", { name: "Ingen strafferabatt" }));
    expect(screen.queryByRole("radiogroup", { name: /Brudd på EMK art\. 6\?/ })).toBeNull();
    expect(screen.getByRole("radio", { name: "Ingen strafferabatt" })).toHaveProperty(
      "checked",
      true,
    );
    fireEvent.change(screen.getByLabelText("Ubetinget fengsel (dager)"), {
      target: { value: "1,5" },
    });
    fireEvent.change(screen.getByLabelText("Bot (kroner)"), { target: { value: "2500" } });
    fireEvent.click(screen.getByRole("radio", { name: "Liggetid hos Nav" }));
    fireEvent.click(
      within(screen.getByRole("radiogroup", { name: "Medvirker? (påkrevd)" })).getByRole("radio", {
        name: "Ja",
      }),
    );
    klikk("Lagre og avslutt");
    expect(screen.getByText("Domsdato må fylles ut")).toBeDefined();
    expect(screen.getByText("Ubetinget fengsel (dager) må være et helt tall")).toBeDefined();
    expect(screen.getByText("Brudd på EMK art. 6? må fylles ut")).toBeDefined();
    expect(submitMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Ubetinget fengsel (dager)"), {
      target: { value: "14" },
    });
    fireEvent.click(
      within(screen.getByRole("radiogroup", { name: "Brudd på EMK art. 6? (påkrevd)" })).getByRole(
        "radio",
        { name: "Nei" },
      ),
    );
    const domfelt = screen.getByLabelText("Domfelt beløp (kroner)");
    fireEvent.change(domfelt, { target: { value: "15000" } });
    expect(domfelt).toHaveProperty("value", "15 000");
    fireEvent.click(screen.getByRole("radio", { name: "Liggetid hos Nav" }));
    const dato = screen.getByLabelText("Domsdato (påkrevd)");
    fireEvent.change(dato, { target: { value: "01.09.2026" } });
    fireEvent.blur(dato);
    klikk("Lagre og avslutt");

    expect(await screen.findByText("Lagret")).toBeDefined();
    expect(sendtSkjema()).toEqual({
      handling: "endre_steg_dialog",
      versjon: "1",
      steg: "AVSLUTTET",
      registrerResultat: "true",
      "resultat.politi.type": "DOMFELLELSE",
      "resultat.politi.domsdato": "2026-09-01",
      "resultat.politi.ubetingetFengselDager": "14",
      "resultat.politi.bot": "2500",
      "resultat.politi.domfeltBelop": "15000",
      "resultat.politi.tilstaaelsesdom": "false",
      "resultat.politi.medvirker": "true",
      "resultat.politi.strafferabattLiggetid": "NAV",
      "resultat.politi.emkBrudd": "false",
    });
  });

  it("avslutter saken med påtaleunnlatelse uten årsak etter varsel om tilgang", async () => {
    renderModal({ steg: "POLITI", status: "VENTER_PA_RESULTAT" });
    klikk("Registrer resultat");
    await screen.findByRole("dialog", { name: "Registrer resultat" });
    fireEvent.click(screen.getByRole("radio", { name: "Påtaleunnlatelse" }));
    klikk("Neste");

    expect(await screen.findByRole("heading", { name: "Påtaleunnlatelse" })).toBeDefined();
    expect(screen.getByText("Tilgang til dokumenter og underlag")).toBeDefined();
    expect(screen.queryByLabelText(/Årsak/)).toBeNull();
    klikk("Lagre og avslutt");

    expect(await screen.findByText("Lagret")).toBeDefined();
    expect(sendtSkjema()).toEqual({
      handling: "endre_steg_dialog",
      versjon: "1",
      steg: "AVSLUTTET",
      registrerResultat: "true",
      "resultat.politi.type": "PATALEUNNLATELSE",
    });
  });

  it("lukker modalen med Avbryt fra valget av resultat", async () => {
    const { onClose } = renderModal({ steg: "POLITI", status: "VENTER_PA_RESULTAT" });
    klikk("Registrer resultat");
    await screen.findByRole("dialog", { name: "Registrer resultat" });
    expect(screen.queryByRole("button", { name: "Tilbake" })).toBeNull();
    klikk("Avbryt");
    expect(onClose).toHaveBeenCalled();
  });

  it("lagrer påklaget henleggelse fra politiet uten å avslutte saken", async () => {
    renderModal({ steg: "POLITI", status: "VENTER_PA_RESULTAT" });
    klikk("Registrer resultat");
    fireEvent.click(await screen.findByRole("radio", { name: "Henlagt" }));
    klikk("Neste");

    await screen.findByRole("heading", { name: "Henlagt" });
    expect(screen.getByText("Tilgang til dokumenter og underlag")).toBeDefined();
    fireEvent.click(screen.getByRole("radio", { name: "Ja" }));
    expect(screen.queryByText("Tilgang til dokumenter og underlag")).toBeNull();
    klikk("Registrer påklaget henleggelse");
    expect(screen.getByText("Årsak må fylles ut")).toBeDefined();
    fireEvent.change(screen.getByLabelText("Årsak (påkrevd)"), {
      target: { value: "Bevisene holder ikke" },
    });
    klikk("Registrer påklaget henleggelse");

    expect(await screen.findByText("Lagret")).toBeDefined();
    expect(sendtSkjema()).toEqual({
      handling: "lagre_resultat",
      versjon: "1",
      "resultat.politi.type": "HENLAGT",
      "resultat.politi.begrunnelse": "Bevisene holder ikke",
      "resultat.paaklaget": "true",
    });
  });

  it("henlegger og avslutter direkte når Nav Kontroll ikke påklager henleggelsen", async () => {
    renderModal({ steg: "POLITI", status: "VENTER_PA_RESULTAT" });
    klikk("Registrer resultat");
    fireEvent.click(await screen.findByRole("radio", { name: "Henlagt" }));
    klikk("Neste");

    await screen.findByRole("heading", { name: "Henlagt" });
    fireEvent.change(screen.getByLabelText("Årsak (påkrevd)"), {
      target: { value: "Bevisene holder ikke" },
    });
    klikk("Lagre og avslutt");

    expect(await screen.findByText("Lagret")).toBeDefined();
    expect(sendtSkjema()).toMatchObject({
      handling: "endre_steg_dialog",
      steg: "AVSLUTTET",
      "resultat.politi.type": "HENLAGT",
      "resultat.paaklaget": "false",
    });
  });

  it("endrer status og viser manglende status som Aktiv", async () => {
    renderModal({ steg: "OPPRETTET", status: null }, "endre-status");
    expect(await screen.findByRole("dialog", { name: "Endre status" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Aktiv" })).toHaveProperty("checked", true);
    expect(screen.queryByRole("button", { name: "Tilbake" })).toBeNull();

    fireEvent.click(screen.getByRole("radio", { name: "I bero" }));
    klikk("Endre status");

    expect(await screen.findByText("Lagret")).toBeDefined();
    expect(sendtSkjema()).toEqual({ handling: "endre_status", versjon: "1", status: "I_BERO" });
  });

  it("tilbyr å gjenoppta saken fra bero", async () => {
    renderModal({ status: "I_BERO", statusFørBero: "AKTIV" }, "endre-status");
    await screen.findByRole("dialog", { name: "Endre status" });
    expect(screen.getByRole("radio", { name: "Aktiv" })).toHaveProperty("checked", true);
  });

  it("avslutter med lagret avgjørelse fra politiet uten å sende resultatet på nytt", async () => {
    renderModal({
      steg: "POLITI",
      status: "VENTER_PA_RESULTAT",
      resultat: { politi: { type: "BOT" } } as KontrollsakResponse["resultat"],
    });
    klikk("Avslutt sak");
    await screen.findByRole("dialog", { name: "Avslutt sak" });
    klikk("Avslutt sak");

    expect(await screen.findByText("Lagret")).toBeDefined();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(sendtSkjema()).toEqual({
      handling: "endre_steg_dialog",
      versjon: "1",
      steg: "AVSLUTTET",
      registrerResultat: "false",
    });
  });

  it("flytter fokus til dialogen når trinnet byttes", async () => {
    renderModal();
    klikk("Henlegg sak");
    await screen.findByRole("dialog", { name: "Henlegg sak" });
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Henlegg sak" }));
  });

  it("viser feilmeldingen fra serveren", async () => {
    mockSvar = { ok: false, feil: "Endringen ble avvist." };
    renderModal({ steg: "OPPRETTET", status: null });
    klikk("Gå til utredning");
    expect(await screen.findByText("Endringen ble avvist.")).toBeDefined();
  });

  it("viser feilmelding og beholder verdiene når lagringen feiler", async () => {
    mockSvar = { ok: false };
    renderModal();
    klikk("Henlegg sak");
    await screen.findByRole("dialog", { name: "Henlegg sak" });
    fireEvent.click(screen.getByRole("radio", { name: "Ikke kapasitet" }));
    klikk("Henlegg og avslutt sak");
    await screen.findByRole("dialog", { name: "Avslutt sak" });
    klikk("Avslutt sak");

    expect(
      await screen.findByText("Kunne ikke lagre endringen. Last inn siden på nytt og prøv igjen."),
    ).toBeDefined();
    expect(screen.getByRole("dialog", { name: "Avslutt sak" })).toBeDefined();
  });

  it("viser «vet ikke» når vi ikke fikk svar fra baksystemet", async () => {
    mockSvar = { ok: false, feil: "intern feil", feilId: "feil-789", teknisk: true, usikker: true };
    renderModal({ steg: "OPPRETTET", status: null });
    klikk("Gå til utredning");

    expect(await screen.findByText("Vi vet ikke om steget ble endret")).toBeDefined();
    expect(
      screen.getByText("Last inn siden og se hvilket steg saken står i før du prøver igjen."),
    ).toBeDefined();
  });

  it("viser kontekstuell feilmelding ved teknisk feil", async () => {
    mockSvar = {
      ok: false,
      feil: "intern feil",
      feilId: "feil-123",
      teknisk: true,
      usikker: false,
    };
    renderModal({ steg: "OPPRETTET", status: null });
    klikk("Gå til utredning");

    expect(await screen.findByText("Vi fikk ikke endret steget")).toBeDefined();
    expect(screen.getByText("feil-123")).toBeDefined();
    expect(screen.queryByText("intern feil")).toBeNull();
    expect(
      screen.getByRole("dialog", { name: "Endre steg eller registrer resultat" }),
    ).toBeDefined();
  });
});
