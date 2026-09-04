import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EndreStatusModal } from "./EndreStatusModal";

const submitMock = vi.fn();
let mockInnsendingsResultat: unknown = undefined;

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
          setData(mockInnsendingsResultat);
        },
        data,
        Form: "form",
      };
    },
  };
});

function renderMedRouter(ui: React.ReactNode) {
  const router = createMemoryRouter([{ path: "/", element: ui }], {
    initialEntries: ["/"],
  });

  return render(<RouterProvider router={router} />);
}

describe("EndreStatusModal", () => {
  afterEach(() => {
    mockInnsendingsResultat = undefined;
  });

  beforeEach(() => {
    submitMock.mockClear();
  });

  it("viser saksstatusvalg i radiogruppe", () => {
    renderMedRouter(
      <EndreStatusModal
        sakId="00000000-0000-4000-8000-000000000001"
        nåværendeStatus="UTREDES"
        nåværendeBlokkering={null}
        nåværendeHenleggelsesarsak={null}
        åpen={true}
        onClose={() => {}}
      />,
    );

    expect(screen.getByRole("radiogroup", { name: "Saksstatus" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Opprettet" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Utredes" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Strafferettslig vurdering" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Anmeldt" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Henlagt" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Avsluttet" })).toBeDefined();
  });

  it("viser arbeidsstatusvalg som standard", () => {
    renderMedRouter(
      <EndreStatusModal
        sakId="00000000-0000-4000-8000-000000000001"
        nåværendeStatus="UTREDES"
        nåværendeBlokkering={null}
        nåværendeHenleggelsesarsak={null}
        åpen={true}
        onClose={() => {}}
      />,
    );

    expect(screen.getByRole("radiogroup", { name: "Arbeidsstatus" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Aktiv" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Venter på vedtak" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Venter på informasjon" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "I bero" })).toBeDefined();
  });

  it("viser henleggelsesårsak når Henlagt velges", () => {
    renderMedRouter(
      <EndreStatusModal
        sakId="00000000-0000-4000-8000-000000000001"
        nåværendeStatus="UTREDES"
        nåværendeBlokkering={null}
        nåværendeHenleggelsesarsak={null}
        åpen={true}
        onClose={() => {}}
      />,
    );

    expect(screen.queryByLabelText("Henleggelsesårsak")).toBeNull();

    fireEvent.click(screen.getByRole("radio", { name: "Henlagt" }));

    expect(screen.getByLabelText("Henleggelsesårsak")).toBeDefined();
    expect(screen.getByRole("option", { name: "Ikke kapasitet" })).toBeDefined();
    expect(screen.getByRole("option", { name: "Ikke tilstrekkelig bevisgrunnlag" })).toBeDefined();
    expect(screen.getByRole("option", { name: "Foreldet" })).toBeDefined();
  });

  it("skjuler henleggelsesårsak når annen status velges", () => {
    renderMedRouter(
      <EndreStatusModal
        sakId="00000000-0000-4000-8000-000000000001"
        nåværendeStatus="UTREDES"
        nåværendeBlokkering={null}
        nåværendeHenleggelsesarsak={null}
        åpen={true}
        onClose={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Henlagt" }));
    expect(screen.getByLabelText("Henleggelsesårsak")).toBeDefined();

    fireEvent.click(screen.getByRole("radio", { name: "Anmeldt" }));
    expect(screen.queryByLabelText("Henleggelsesårsak")).toBeNull();
  });

  it("skjuler arbeidsstatus ved Avsluttet, og viser advarsel i bekreftelsessteget", () => {
    renderMedRouter(
      <EndreStatusModal
        sakId="00000000-0000-4000-8000-000000000001"
        nåværendeStatus="UTREDES"
        nåværendeBlokkering={"I_BERO"}
        nåværendeHenleggelsesarsak={null}
        åpen={true}
        onClose={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Avsluttet" }));

    expect(screen.queryByRole("radiogroup", { name: "Arbeidsstatus" })).toBeNull();
    expect(
      screen.queryByText("Avsluttet er en endelig status – du kan ikke endre tilbake"),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));

    expect(
      screen.getByText("Avsluttet er en endelig status – du kan ikke endre tilbake"),
    ).toBeDefined();
  });

  it("viser bekreftelsessteg før innsending, og sender først når bruker bekrefter", () => {
    renderMedRouter(
      <EndreStatusModal
        sakId="00000000-0000-4000-8000-000000000001"
        nåværendeStatus="UTREDES"
        nåværendeBlokkering={"I_BERO"}
        nåværendeHenleggelsesarsak={null}
        åpen={true}
        onClose={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Avsluttet" }));
    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));

    expect(submitMock).not.toHaveBeenCalled();
    expect(screen.getByText("Du endrer nå status på saken:")).toBeDefined();
    expect(screen.getByText("Fra «Utredes» til «Avsluttet»")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Endre status" }));

    expect(submitMock).toHaveBeenCalledOnce();
    const formData = submitMock.mock.calls[0][0] as FormData;
    expect(formData.get("status")).toBe("AVSLUTTET");
  });

  it("går tilbake til skjemaet når bruker avbryter i bekreftelsessteget", () => {
    renderMedRouter(
      <EndreStatusModal
        sakId="00000000-0000-4000-8000-000000000001"
        nåværendeStatus="UTREDES"
        nåværendeBlokkering={null}
        nåværendeHenleggelsesarsak={null}
        åpen={true}
        onClose={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Anmeldt" }));
    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    expect(screen.getByText("Du endrer nå status på saken:")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }));

    expect(submitMock).not.toHaveBeenCalled();
    expect(screen.getByRole("radiogroup", { name: "Saksstatus" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Anmeldt" })).toBeDefined();
  });

  it("viser feil ved henlagt uten henleggelsesårsak", () => {
    renderMedRouter(
      <EndreStatusModal
        sakId="00000000-0000-4000-8000-000000000001"
        nåværendeStatus="UTREDES"
        nåværendeBlokkering={null}
        nåværendeHenleggelsesarsak={null}
        åpen={true}
        onClose={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Henlagt" }));
    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));

    expect(screen.getByText("Du må velge henleggelsesårsak.")).toBeDefined();
    expect(submitMock).not.toHaveBeenCalled();
  });

  it("sender inn samlet statusdialog med riktig payload", () => {
    renderMedRouter(
      <EndreStatusModal
        sakId="00000000-0000-4000-8000-000000000001"
        nåværendeStatus="UTREDES"
        nåværendeBlokkering={null}
        nåværendeHenleggelsesarsak={null}
        åpen={true}
        onClose={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Henlagt" }));
    fireEvent.change(screen.getByLabelText("Henleggelsesårsak"), {
      target: { value: "IKKE_KAPASITET" },
    });
    fireEvent.click(screen.getByRole("radio", { name: "Venter på informasjon" }));

    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    fireEvent.click(screen.getByRole("button", { name: "Endre status" }));

    expect(submitMock).toHaveBeenCalledOnce();
    const formData = submitMock.mock.calls[0][0] as FormData;
    expect(formData.get("status")).toBe("HENLAGT");
    expect(formData.get("henleggelsesarsak")).toBe("IKKE_KAPASITET");
    expect(formData.get("handling")).toBe("endre_status_dialog");
    expect(formData.get("blokkert")).toBe("VENTER_PA_INFORMASJON");
  });

  it("tillater no-op for henlagt med eksisterende henleggelsesårsak", () => {
    renderMedRouter(
      <EndreStatusModal
        sakId="00000000-0000-4000-8000-000000000001"
        nåværendeStatus="HENLAGT"
        nåværendeBlokkering={null}
        nåværendeHenleggelsesarsak="IKKE_KAPASITET"
        åpen={true}
        onClose={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    fireEvent.click(screen.getByRole("button", { name: "Endre status" }));

    expect(submitMock).toHaveBeenCalledOnce();
    const formData = submitMock.mock.calls[0][0] as FormData;
    expect(formData.get("status")).toBe("HENLAGT");
    expect(formData.get("henleggelsesarsak")).toBe("IKKE_KAPASITET");
  });

  it("viser suksesssteg med ny status etter vellykket innsending", () => {
    mockInnsendingsResultat = { ok: true };

    renderMedRouter(
      <EndreStatusModal
        sakId="00000000-0000-4000-8000-000000000001"
        nåværendeStatus="OPPRETTET"
        nåværendeBlokkering={null}
        nåværendeHenleggelsesarsak={null}
        åpen={true}
        onClose={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Utredes" }));
    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    fireEvent.click(screen.getByRole("button", { name: "Endre status" }));

    expect(screen.getByText("Status endret")).toBeDefined();
    expect(screen.getByText("Statusen på saken er endret til «Utredes».")).toBeDefined();
    expect(screen.getAllByRole("button", { name: "Lukk" }).length).toBeGreaterThan(0);
  });
});
