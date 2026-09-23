import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TillatteHandlingerResponse } from "~/saker/types.backend";
import { validerResultatFeltNavn } from "./resultat-request";
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
          setData(mockInnsendingsResultat ?? { ok: true });
        },
        data,
        Form: "form",
      };
    },
  };
});

const basisHandlinger: TillatteHandlingerResponse = {
  versjon: 1,
  tilstand: {
    steg: "UTREDNING",
    status: "AKTIV",
    statusFørBero: null,
    resultat: null,
    ytelser: [],
  },
  handlinger: [
    { type: "FLYTT_TIL_NESTE_STEG", metode: "POST", sti: "/api/v1/kontrollsaker/1/steg" },
    { type: "ENDRE_STATUS", metode: "POST", sti: "/api/v1/kontrollsaker/1/status" },
    { type: "REGISTRER_RESULTAT", metode: "PUT", sti: "/api/v1/kontrollsaker/1/resultat" },
    {
      type: "HENLEGG",
      metode: "PUT",
      sti: "/api/v1/kontrollsaker/1/resultat",
      resultatType: "HENLAGT",
    },
    { type: "SETT_I_BERO", metode: "POST", sti: "/api/v1/kontrollsaker/1/status" },
    { type: "TA_UT_AV_BERO", metode: "POST", sti: "/api/v1/kontrollsaker/1/status" },
  ],
  tillatteSteg: ["FORVALTNING"],
  tillatteStatuser: ["VENTER_PA_INFORMASJON"],
  tillatteResultater: ["KONTROLLNOTAT", "HENLAGT"],
  paakrevdeRegistreringer: ["utredning.type"],
  paakrevdeRegistreringerPerSteg: { FORVALTNING: ["utredning.type", "ytelser[].belop"] },
  feltskjema: [
    {
      felt: "utredning.type",
      etikett: "Resultat fra utredningen",
      datatype: "enum",
      paakrevd: true,
      verdier: [
        { verdi: "KONTROLLNOTAT", etikett: "Kontrollnotat" },
        { verdi: "HENLAGT", etikett: "Henlagt" },
      ],
    },
    {
      felt: "utredning.henleggelsesarsak",
      etikett: "Årsak til henleggelse",
      datatype: "enum",
      paakrevd: false,
      paakrevdNar: "utredning.type=HENLAGT",
      verdier: [{ verdi: "IKKE_TILSTREKKELIG_SKYLD", etikett: "Ikke tilstrekkelig skyld" }],
    },
  ],
};

async function visModal(
  handling: TillatteHandlingerResponse["handlinger"][number]["type"],
  tillatteHandlinger = basisHandlinger,
) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <EndreStatusModal
            sakId="00000000-0000-4000-8000-000000000001"
            tillatteHandlinger={tillatteHandlinger}
            handling={handling}
            onClose={() => {}}
          />
        ),
      },
    ],
    { initialEntries: ["/"] },
  );

  render(<RouterProvider router={router} />);
  await waitFor(() => {});
}

describe("EndreStatusModal", () => {
  beforeEach(() => {
    submitMock.mockClear();
  });

  afterEach(() => {
    mockInnsendingsResultat = undefined;
  });

  it("viser bare steg og statuser som backend har tillatt", async () => {
    await visModal("FLYTT_TIL_NESTE_STEG");
    const tillattSteg = screen.getByRole("radio", { name: "Forvaltning" });
    expect(tillattSteg).toBeDefined();
    expect(tillattSteg.getAttribute("name")).toBe("steg");
    fireEvent.click(tillattSteg);
    const form = tillattSteg.closest("form");
    if (!form) throw new Error("Fant ikke skjemaet for stegbytte");
    const formData = new FormData(form);
    expect(formData.getAll("steg")).toEqual(["FORVALTNING"]);
    expect(() => validerResultatFeltNavn(formData, [])).not.toThrow();
    expect(screen.queryByRole("radio", { name: "Politi" })).toBeNull();

    const statusvalg = basisHandlinger.tillatteStatuser.map((status) =>
      status === null ? "Ingen status" : status,
    );
    expect(statusvalg).toEqual(["VENTER_PA_INFORMASJON"]);

    cleanup();
    await visModal("ENDRE_STATUS");
    expect(screen.getByRole("combobox", { name: "Status" })).toBeDefined();
    expect(screen.getByRole("option", { name: "Venter på informasjon" })).toBeDefined();
    expect(screen.queryByRole("option", { name: "I bero" })).toBeNull();
  });

  it("sender inn resultat med versjonert request og feltnavn fra schemaet", async () => {
    await visModal("REGISTRER_RESULTAT");

    fireEvent.change(screen.getByLabelText("Resultat fra utredningen"), {
      target: { value: "HENLAGT" },
    });
    fireEvent.change(screen.getByLabelText("Årsak til henleggelse"), {
      target: { value: "IKKE_TILSTREKKELIG_SKYLD" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Fortsett" }));
    await waitFor(() => {});
    expect(screen.getByText("Resultatet registreres for gjeldende steg.")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Bekreft" }));
    await waitFor(() => {});

    const formData = submitMock.mock.calls[0]?.[0] as FormData;
    expect(formData.get("handling")).toBe("registrer_resultat");
    expect(formData.get("resultat.utredning.type")).toBe("HENLAGT");
    expect(formData.get("resultat.utredning.henleggelsesarsak")).toBe("IKKE_TILSTREKKELIG_SKYLD");
    expect(
      screen.getByText("Endringen på sak #00000000-0000-4000-8000-000000000001 er lagret."),
    ).toBeDefined();
  });

  it("viser betingede tekst- og boolske felter og beløp fra ytelsene", async () => {
    const politiHandlinger: TillatteHandlingerResponse = {
      ...basisHandlinger,
      tilstand: {
        ...basisHandlinger.tilstand,
        steg: "POLITI",
        ytelser: [
          {
            id: "00000000-0000-4000-8000-000000000001",
            type: "DAGPENGER",
            periodeFra: null,
            periodeTil: null,
            belop: 1250,
            endeligBelop: null,
          },
        ],
      },
      tillatteResultater: ["DOMFELLELSE"],
      feltskjema: [
        {
          felt: "politi.type",
          etikett: "Resultat fra politiet",
          datatype: "enum",
          paakrevd: true,
          verdier: [{ verdi: "DOMFELLELSE", etikett: "Domfellelse" }],
        },
        {
          felt: "politi.domstype",
          etikett: "Type dom",
          datatype: "tekst",
          paakrevd: false,
          paakrevdNar: "politi.type=DOMFELLELSE",
          verdier: [],
        },
        {
          felt: "politi.redusertForEmkArtikkel6",
          etikett: "Reduksjon etter EMK artikkel 6",
          datatype: "boolsk",
          paakrevd: false,
          paakrevdNar: "politi.type=DOMFELLELSE",
          verdier: [],
        },
        {
          felt: "ytelser[].belop",
          etikett: "Beløp for ytelsen",
          datatype: "belop",
          paakrevd: false,
          verdier: [],
        },
      ],
    };

    await visModal("REGISTRER_RESULTAT", politiHandlinger);
    fireEvent.change(screen.getByLabelText("Resultat fra politiet"), {
      target: { value: "DOMFELLELSE" },
    });
    expect(screen.getByLabelText("Type dom")).toBeDefined();
    expect(screen.getByRole("checkbox", { name: "Reduksjon etter EMK artikkel 6" })).toBeDefined();
    expect(screen.getByLabelText("Beløp for ytelsen 1 (DAGPENGER)")).toHaveProperty(
      "value",
      "1250",
    );
  });

  it("tvinger HENLAGT når handlingen fra API-et er henleggelse", async () => {
    await visModal("HENLEGG");
    expect(screen.getByLabelText("Resultat fra utredningen")).toHaveProperty("value", "HENLAGT");
    expect(screen.getByRole("dialog", { name: "Registrer henleggelse" })).toBeDefined();

    fireEvent.change(screen.getByLabelText("Årsak til henleggelse"), {
      target: { value: "IKKE_TILSTREKKELIG_SKYLD" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Fortsett" }));
    fireEvent.click(screen.getByRole("button", { name: "Lagre henleggelse" }));
    await waitFor(() => {});

    const formData = submitMock.mock.calls[0]?.[0] as FormData;
    expect(formData.get("handling")).toBe("henlegg");
    expect(formData.get("resultat.utredning.type")).toBe("HENLAGT");
    expect(formData.get("resultat.utredning.henleggelsesarsak")).toBe("IKKE_TILSTREKKELIG_SKYLD");
  });

  it("tilbyr statusen før bero når saken skal gjenopptas", async () => {
    const beroHandlinger = {
      ...basisHandlinger,
      tilstand: {
        ...basisHandlinger.tilstand,
        status: "I_BERO" as const,
        statusFørBero: "AKTIV" as const,
      },
      tillatteStatuser: ["AKTIV"] as const,
    } satisfies TillatteHandlingerResponse;

    cleanup();
    await visModal("TA_UT_AV_BERO", beroHandlinger);
    expect(screen.getByText("Når du gjenopptar saken, blir statusen Aktiv.")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Fortsett" }));
    fireEvent.click(screen.getByRole("button", { name: "Bekreft" }));
    await waitFor(() => {});

    const formData = submitMock.mock.calls[0]?.[0] as FormData;
    expect(formData.get("handling")).toBe("ta_ut_av_bero");
    expect(formData.get("status")).toBe("AKTIV");
  });
});
