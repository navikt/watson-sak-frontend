import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

async function renderMedRouter(ui: React.ReactNode) {
  const router = createMemoryRouter([{ path: "/", element: ui }], {
    initialEntries: ["/"],
  });

  const resultat = render(<RouterProvider router={router} />);
  await waitFor(() => {});
  return resultat;
}

describe("EndreStatusModal", () => {
  afterEach(() => {
    mockInnsendingsResultat = undefined;
  });

  beforeEach(() => {
    submitMock.mockClear();
  });

  it("viser saksstatusvalg i radiogruppe", async () => {
    await renderMedRouter(
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

  it("viser arbeidsstatusvalg som standard", async () => {
    await renderMedRouter(
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

  it("viser henleggelsesårsak når Henlagt velges", async () => {
    await renderMedRouter(
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
    await waitFor(() => {});

    expect(screen.getByLabelText("Henleggelsesårsak")).toBeDefined();
    expect(screen.getByRole("option", { name: "Ikke kapasitet" })).toBeDefined();
    expect(screen.getByRole("option", { name: "Ikke tilstrekkelig bevisgrunnlag" })).toBeDefined();
    expect(screen.getByRole("option", { name: "Foreldet" })).toBeDefined();
  });

  it("skjuler henleggelsesårsak når annen status velges", async () => {
    await renderMedRouter(
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
    await waitFor(() => {});
    expect(screen.getByLabelText("Henleggelsesårsak")).toBeDefined();

    fireEvent.click(screen.getByRole("radio", { name: "Anmeldt" }));
    await waitFor(() => {});
    expect(screen.queryByLabelText("Henleggelsesårsak")).toBeNull();
  });

  it("skjuler arbeidsstatus ved Avsluttet, og viser advarsel i bekreftelsessteget", async () => {
    await renderMedRouter(
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
    await waitFor(() => {});

    expect(screen.queryByRole("radiogroup", { name: "Arbeidsstatus" })).toBeNull();
    expect(
      screen.queryByText("Avsluttet er en endelig status – du kan ikke endre tilbake"),
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() => {});

    expect(
      screen.getByText("Avsluttet er en endelig status – du kan ikke endre tilbake"),
    ).toBeDefined();
  });

  it("viser bekreftelsessteg før innsending, og sender først når bruker bekrefter", async () => {
    await renderMedRouter(
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
    await waitFor(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() => {});

    expect(submitMock).not.toHaveBeenCalled();
    expect(screen.getByText("Du endrer nå status på saken:")).toBeDefined();
    expect(screen.getByText("Fra «Utredes» til «Avsluttet»")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Endre status" }));
    await waitFor(() => {});

    expect(submitMock).toHaveBeenCalledOnce();
    const formData = submitMock.mock.calls[0][0] as FormData;
    expect(formData.get("status")).toBe("AVSLUTTET");
  });

  it("plasserer primærhandlingen før Avbryt i bekreftelsesmodalen", async () => {
    await renderMedRouter(
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
    await waitFor(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() => {});

    expect(
      screen
        .getByRole("button", { name: "Endre status" })
        .compareDocumentPosition(screen.getByRole("button", { name: "Avbryt" })),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("går tilbake til skjemaet når bruker avbryter i bekreftelsessteget", async () => {
    await renderMedRouter(
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
    await waitFor(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() => {});
    expect(screen.getByText("Du endrer nå status på saken:")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Avbryt" }));
    await waitFor(() => {});

    expect(submitMock).not.toHaveBeenCalled();
    expect(screen.getByRole("radiogroup", { name: "Saksstatus" })).toBeDefined();
    expect(screen.getByRole("radio", { name: "Anmeldt" })).toBeDefined();
  });

  it("viser feil ved henlagt uten henleggelsesårsak", async () => {
    await renderMedRouter(
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
    await waitFor(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() => {});

    expect(screen.getByText("Du må velge henleggelsesårsak.")).toBeDefined();
    expect(submitMock).not.toHaveBeenCalled();
  });

  it("sender inn samlet statusdialog med riktig payload", async () => {
    await renderMedRouter(
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
    await waitFor(() => {});
    fireEvent.change(screen.getByLabelText("Henleggelsesårsak"), {
      target: { value: "IKKE_KAPASITET" },
    });
    fireEvent.click(screen.getByRole("radio", { name: "Venter på informasjon" }));
    await waitFor(() => {});

    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Endre status" }));
    await waitFor(() => {});

    expect(submitMock).toHaveBeenCalledOnce();
    const formData = submitMock.mock.calls[0][0] as FormData;
    expect(formData.get("status")).toBe("HENLAGT");
    expect(formData.get("henleggelsesarsak")).toBe("IKKE_KAPASITET");
    expect(formData.get("handling")).toBe("endre_status_dialog");
    expect(formData.get("blokkert")).toBe("VENTER_PA_INFORMASJON");
  });

  it("tillater no-op for henlagt med eksisterende henleggelsesårsak", async () => {
    await renderMedRouter(
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
    await waitFor(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Endre status" }));
    await waitFor(() => {});

    expect(submitMock).toHaveBeenCalledOnce();
    const formData = submitMock.mock.calls[0][0] as FormData;
    expect(formData.get("status")).toBe("HENLAGT");
    expect(formData.get("henleggelsesarsak")).toBe("IKKE_KAPASITET");
  });

  it("viser suksesssteg med ny status etter vellykket innsending", async () => {
    mockInnsendingsResultat = { ok: true };

    await renderMedRouter(
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
    await waitFor(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Endre status" }));
    await waitFor(() => {});

    expect(screen.getByText("Status endret")).toBeDefined();
    expect(
      screen.getByText(
        "Statusen på sak #00000000-0000-4000-8000-000000000001 er satt til Utredes.",
      ),
    ).toBeDefined();
    expect(screen.getAllByRole("button", { name: "Lukk" }).length).toBeGreaterThan(0);
  });

  it("beholder korrekt suksessmelding selv om nåværendeStatus oppdateres samtidig (revalidering)", async () => {
    mockInnsendingsResultat = { ok: true };

    function Wrapper({ status }: { status: "OPPRETTET" | "UTREDES" }) {
      return (
        <EndreStatusModal
          sakId="00000000-0000-4000-8000-000000000001"
          nåværendeStatus={status}
          nåværendeBlokkering={null}
          nåværendeHenleggelsesarsak={null}
          åpen={true}
          onClose={() => {}}
        />
      );
    }

    const router = createMemoryRouter([{ path: "/", element: <Wrapper status="OPPRETTET" /> }], {
      initialEntries: ["/"],
    });
    const { rerender } = render(<RouterProvider router={router} />);
    await waitFor(() => {});

    fireEvent.click(screen.getByRole("radio", { name: "Utredes" }));
    await waitFor(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Endre status" }));
    await waitFor(() => {});

    // Simulerer at loaderen revaliderer og sender inn den nye statusen som prop,
    // slik at nåværendeStatus === valgtStatus akkurat idet suksesssteget vises.
    const router2 = createMemoryRouter([{ path: "/", element: <Wrapper status="UTREDES" /> }], {
      initialEntries: ["/"],
    });
    rerender(<RouterProvider router={router2} />);
    await waitFor(() => {});

    expect(screen.getByText("Status endret")).toBeDefined();
    expect(
      screen.getByText(
        "Statusen på sak #00000000-0000-4000-8000-000000000001 er satt til Utredes.",
      ),
    ).toBeDefined();
  });

  it("viser kun arbeidsstatusendringen i suksessmeldingen når status er uendret", async () => {
    mockInnsendingsResultat = { ok: true };

    await renderMedRouter(
      <EndreStatusModal
        sakId="00000000-0000-4000-8000-000000000001"
        nåværendeStatus="UTREDES"
        nåværendeBlokkering={null}
        nåværendeHenleggelsesarsak={null}
        åpen={true}
        onClose={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "I bero" }));
    await waitFor(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Endre status" }));
    await waitFor(() => {});

    expect(screen.getByText("Status endret")).toBeDefined();
    expect(
      screen.getByText(
        "Arbeidsstatusen på sak #00000000-0000-4000-8000-000000000001 er satt til i bero.",
      ),
    ).toBeDefined();
  });

  it("viser både status- og arbeidsstatusendring i suksessmeldingen når begge er endret", async () => {
    mockInnsendingsResultat = { ok: true };

    await renderMedRouter(
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
    await waitFor(() => {});
    fireEvent.click(screen.getByRole("radio", { name: "I bero" }));
    await waitFor(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Endre status" }));
    await waitFor(() => {});

    expect(screen.getByText("Status endret")).toBeDefined();
    expect(
      screen.getByText(
        "Statusen på sak #00000000-0000-4000-8000-000000000001 er satt til Utredes, og arbeidsstatusen er satt til i bero.",
      ),
    ).toBeDefined();
  });

  it("viser feilmelding og blir i bekreftelsessteget når innsending feiler", async () => {
    mockInnsendingsResultat = { ok: false };

    await renderMedRouter(
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
    await waitFor(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() => {});
    fireEvent.click(screen.getByRole("button", { name: "Endre status" }));
    await waitFor(() => {});

    expect(submitMock).toHaveBeenCalledOnce();
    expect(screen.getByText("Kunne ikke endre status. Prøv igjen.")).toBeDefined();
    expect(screen.getByText("Du endrer nå status på saken:")).toBeDefined();
    expect(screen.getByRole("button", { name: "Endre status" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Endre status" }));
    await waitFor(() => {});

    expect(submitMock).toHaveBeenCalledTimes(2);
  });

  it("trimmer beskrivelse før innsending, slik at sammendraget matcher det som sendes", async () => {
    await renderMedRouter(
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
    await waitFor(() => {});
    fireEvent.change(screen.getByLabelText("Beskrivelse (valgfritt)"), {
      target: { value: "  Saken er anmeldt  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lagre" }));
    await waitFor(() => {});

    expect(screen.getByText("Saken er anmeldt")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Endre status" }));
    await waitFor(() => {});

    const formData = submitMock.mock.calls[0][0] as FormData;
    expect(formData.get("beskrivelse")).toBe("Saken er anmeldt");
  });
});
