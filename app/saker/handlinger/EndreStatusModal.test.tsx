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

function forvaltningHandlinger(
  resultat: TillatteHandlingerResponse["tilstand"]["resultat"] = null,
): TillatteHandlingerResponse {
  return {
    ...basisHandlinger,
    tilstand: {
      ...basisHandlinger.tilstand,
      steg: "FORVALTNING",
      status: "VENTER_PA_VEDTAK",
      resultat,
      ytelser: [
        {
          id: "00000000-0000-4000-8000-000000000001",
          type: "SYKEPENGER",
          periodeFra: null,
          periodeTil: null,
          belop: 100,
          endeligBelop: null,
        },
      ],
    },
    tillatteSteg: [],
    muligeNesteSteg: ["STRAFFERETTSLIG_VURDERING", "AVSLUTTET"],
    tillatteResultater: [
      "SAKEN_SKAL_VURDERES_FOR_ANMELDELSE",
      "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
      "FEILUTBETALINGSSAK_ORDINAER",
      "KONTROLLNOTAT",
      "HENLAGT",
    ],
    paakrevdeRegistreringerPerSteg: {
      STRAFFERETTSLIG_VURDERING: ["forvaltning.type", "ytelser[].endeligBelop"],
      AVSLUTTET: [
        "forvaltning.type",
        "forvaltning.endeligUtfall.type",
        "ytelser[].endeligBelop ved FEILUTBETALINGSSAK_ORDINAER",
      ],
    },
    feltskjema: [
      {
        felt: "forvaltning.type",
        etikett: "Beslutning i forvaltningen",
        datatype: "enum",
        paakrevd: true,
        verdier: [
          {
            verdi: "SAKEN_SKAL_VURDERES_FOR_ANMELDELSE",
            etikett: "Saken skal vurderes for anmeldelse",
          },
          {
            verdi: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
            etikett: "Saken skal ikke vurderes for anmeldelse",
          },
        ],
      },
      {
        felt: "forvaltning.endeligUtfall.type",
        etikett: "Endelig resultat",
        datatype: "enum",
        paakrevd: false,
        paakrevdNar: "forvaltning.type=SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
        verdier: [
          { verdi: "HENLAGT", etikett: "Henlagt" },
          { verdi: "KONTROLLNOTAT", etikett: "Kontrollnotat" },
          { verdi: "FEILUTBETALINGSSAK_ORDINAER", etikett: "Feilutbetalingssak, ordinær" },
        ],
      },
      {
        felt: "forvaltning.endeligUtfall.henleggelsesarsak",
        etikett: "Årsak til henleggelse",
        datatype: "enum",
        paakrevd: false,
        paakrevdNar: "forvaltning.endeligUtfall.type=HENLAGT",
        verdier: [{ verdi: "IKKE_KAPASITET", etikett: "Ikke kapasitet" }],
      },
      {
        felt: "ytelser[].endeligBelop",
        etikett: "Endelig beløp for ytelsen",
        datatype: "belop",
        paakrevd: false,
        verdier: [],
      },
    ],
  };
}

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
    await visModal("FLYTT_TIL_NESTE_STEG", {
      ...basisHandlinger,
      tilstand: {
        ...basisHandlinger.tilstand,
        resultat: { utredning: { type: "FEILUTBETALINGSSAK_ORDINAER" } },
      },
    });
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

  it("krever resultat og beløp i flyttemodalen når Utredning mangler lagret resultat", async () => {
    const ytelseId = "00000000-0000-4000-8000-000000000001";
    await visModal("FLYTT_TIL_NESTE_STEG", {
      ...basisHandlinger,
      tilstand: {
        ...basisHandlinger.tilstand,
        ytelser: [
          {
            id: ytelseId,
            type: "SYKEPENGER",
            periodeFra: null,
            periodeTil: null,
            belop: null,
            endeligBelop: null,
          },
        ],
      },
      tillatteSteg: [],
      muligeNesteSteg: ["FORVALTNING"],
      tillatteResultater: ["FEILUTBETALINGSSAK_ORDINAER"],
      feltskjema: [
        {
          ...basisHandlinger.feltskjema[0],
          verdier: [
            { verdi: "FEILUTBETALINGSSAK_ORDINAER", etikett: "Feilutbetalingssak, ordinær" },
          ],
        },
        {
          felt: "ytelser[].belop",
          etikett: "Antatt beløp",
          datatype: "belop",
          paakrevd: false,
          verdier: [],
        },
      ],
    });

    fireEvent.click(screen.getByRole("radio", { name: "Forvaltning" }));
    expect(
      screen.queryByRole("checkbox", { name: "Registrer resultat fra gjeldende steg" }),
    ).toBeNull();
    expect(screen.getByLabelText("Resultat fra utredningen")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Fortsett" }));
    expect(screen.queryByRole("button", { name: "Bekreft" })).toBeNull();
    expect(submitMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Resultat fra utredningen"), {
      target: { value: "FEILUTBETALINGSSAK_ORDINAER" },
    });
    fireEvent.change(screen.getByLabelText("Antatt beløp 1 (SYKEPENGER)"), {
      target: { value: "100" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Fortsett" }));
    fireEvent.click(screen.getByRole("button", { name: "Bekreft" }));
    await waitFor(() => expect(submitMock).toHaveBeenCalledOnce());

    const formData = submitMock.mock.calls[0]?.[0] as FormData;
    expect(formData.get("registrerResultat")).toBe("true");
    expect(formData.get("steg")).toBe("FORVALTNING");
    expect(formData.get("resultat.utredning.type")).toBe("FEILUTBETALINGSSAK_ORDINAER");
    expect(formData.get(`ytelse.${ytelseId}.belop`)).toBe("100");
  });

  it("krever ikke nytt resultat når resultatet allerede er lagret", async () => {
    await visModal("FLYTT_TIL_NESTE_STEG", {
      ...basisHandlinger,
      tilstand: {
        ...basisHandlinger.tilstand,
        resultat: { utredning: { type: "FEILUTBETALINGSSAK_ORDINAER" } },
      },
      tillatteResultater: ["FEILUTBETALINGSSAK_ORDINAER"],
    });
    fireEvent.click(screen.getByRole("radio", { name: "Forvaltning" }));
    expect(
      screen.getByRole("checkbox", { name: "Registrer resultat fra gjeldende steg" }),
    ).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Fortsett" }));
    fireEvent.click(screen.getByRole("button", { name: "Bekreft" }));
    await waitFor(() => expect(submitMock).toHaveBeenCalledOnce());
    const formData = submitMock.mock.calls[0]?.[0] as FormData;
    expect(formData.get("registrerResultat")).toBe("false");
  });

  it("krever endelig utfall når bare beslutningen i Forvaltning er lagret", async () => {
    await visModal("FLYTT_TIL_NESTE_STEG", {
      ...basisHandlinger,
      tilstand: {
        ...basisHandlinger.tilstand,
        steg: "FORVALTNING",
        resultat: { forvaltning: { type: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE" } },
      },
      tillatteSteg: [],
      muligeNesteSteg: ["AVSLUTTET"],
      tillatteResultater: ["SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE", "KONTROLLNOTAT", "HENLAGT"],
      feltskjema: [
        {
          felt: "forvaltning.type",
          etikett: "Beslutning i forvaltningen",
          datatype: "enum",
          paakrevd: true,
          verdier: [
            {
              verdi: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
              etikett: "Saken skal ikke vurderes for anmeldelse",
            },
          ],
        },
        {
          felt: "forvaltning.endeligUtfall.type",
          etikett: "Endelig resultat",
          datatype: "enum",
          paakrevd: false,
          paakrevdNar: "forvaltning.type=SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
          verdier: [
            { verdi: "KONTROLLNOTAT", etikett: "Kontrollnotat" },
            { verdi: "HENLAGT", etikett: "Henlagt" },
          ],
        },
      ],
      paakrevdeRegistreringerPerSteg: {
        AVSLUTTET: ["forvaltning.type", "forvaltning.endeligUtfall.type"],
      },
    });

    fireEvent.click(screen.getByRole("radio", { name: "Avsluttet" }));
    expect(
      screen.queryByRole("checkbox", { name: "Registrer resultat fra gjeldende steg" }),
    ).toBeNull();
    expect(screen.getByLabelText("Endelig resultat")).toBeDefined();
    expect(screen.getByRole("option", { name: "Henlagt" })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Fortsett" }));
    expect(screen.getByRole("alert").textContent).toContain("Velg endelig resultat");
    fireEvent.change(screen.getByLabelText("Endelig resultat"), {
      target: { value: "KONTROLLNOTAT" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Fortsett" }));
    fireEvent.click(screen.getByRole("button", { name: "Bekreft" }));
    await waitFor(() => expect(submitMock).toHaveBeenCalledOnce());
    const formData = submitMock.mock.calls[0]?.[0] as FormData;
    expect(formData.get("resultat.forvaltning.type")).toBe(
      "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
    );
    expect(formData.get("resultat.forvaltning.endeligUtfall.type")).toBe("KONTROLLNOTAT");
  });

  it("tilbyr Avsluttet og registrerer henleggelse med årsak uten endelig beløp", async () => {
    await visModal("FLYTT_TIL_NESTE_STEG", forvaltningHandlinger());
    expect(screen.getByRole("radio", { name: "Strafferettslig vurdering" })).toBeDefined();
    fireEvent.click(screen.getByRole("radio", { name: "Avsluttet" }));
    expect(screen.getByLabelText("Beslutning i forvaltningen")).toHaveProperty(
      "value",
      "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
    );
    expect(screen.queryByLabelText("Endelig beløp for ytelsen 1 (SYKEPENGER)")).toBeNull();
    fireEvent.change(screen.getByLabelText("Endelig resultat"), {
      target: { value: "HENLAGT" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Fortsett" }));
    expect(screen.getByRole("alert").textContent).toContain("Årsak til henleggelse");
    fireEvent.change(screen.getByLabelText("Årsak til henleggelse"), {
      target: { value: "IKKE_KAPASITET" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Fortsett" }));
    fireEvent.click(screen.getByRole("button", { name: "Bekreft" }));
    await waitFor(() => expect(submitMock).toHaveBeenCalledOnce());
    const formData = submitMock.mock.calls[0]?.[0] as FormData;
    expect(formData.get("resultat.forvaltning.type")).toBe(
      "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
    );
    expect(formData.get("resultat.forvaltning.endeligUtfall.type")).toBe("HENLAGT");
    expect(formData.get("resultat.forvaltning.endeligUtfall.henleggelsesarsak")).toBe(
      "IKKE_KAPASITET",
    );
    expect([...formData.keys()].some((key) => key.endsWith(".endeligBelop"))).toBe(false);
  });

  it("avslutter som Kontrollnotat uten endelig beløp", async () => {
    await visModal("FLYTT_TIL_NESTE_STEG", forvaltningHandlinger());
    fireEvent.click(screen.getByRole("radio", { name: "Avsluttet" }));
    fireEvent.change(screen.getByLabelText("Endelig resultat"), {
      target: { value: "KONTROLLNOTAT" },
    });
    expect(screen.queryByLabelText("Endelig beløp for ytelsen 1 (SYKEPENGER)")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Fortsett" }));
    fireEvent.click(screen.getByRole("button", { name: "Bekreft" }));
    await waitFor(() => expect(submitMock).toHaveBeenCalledOnce());
    const formData = submitMock.mock.calls[0]?.[0] as FormData;
    expect(formData.get("resultat.forvaltning.endeligUtfall.type")).toBe("KONTROLLNOTAT");
    expect([...formData.keys()].some((key) => key.endsWith(".endeligBelop"))).toBe(false);
  });

  it("lar en lagret beslutning endres når saksbehandleren velger Avsluttet", async () => {
    await visModal(
      "FLYTT_TIL_NESTE_STEG",
      forvaltningHandlinger({
        forvaltning: { type: "SAKEN_SKAL_VURDERES_FOR_ANMELDELSE" },
      }),
    );
    expect(screen.getByRole("radio", { name: "Strafferettslig vurdering" })).toBeDefined();
    fireEvent.click(screen.getByRole("radio", { name: "Avsluttet" }));
    expect(
      screen.queryByRole("checkbox", { name: "Registrer resultat fra gjeldende steg" }),
    ).toBeNull();
    expect(screen.getByLabelText("Beslutning i forvaltningen")).toHaveProperty(
      "value",
      "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
    );
    fireEvent.change(screen.getByLabelText("Endelig resultat"), {
      target: { value: "KONTROLLNOTAT" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Fortsett" }));
    fireEvent.click(screen.getByRole("button", { name: "Bekreft" }));
    await waitFor(() => expect(submitMock).toHaveBeenCalledOnce());
    const formData = submitMock.mock.calls[0]?.[0] as FormData;
    expect(formData.get("registrerResultat")).toBe("true");
    expect(formData.get("resultat.forvaltning.type")).toBe(
      "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
    );
  });

  it("krever endelig beløp når saken går til Strafferettslig vurdering", async () => {
    await visModal("FLYTT_TIL_NESTE_STEG", forvaltningHandlinger());
    fireEvent.click(screen.getByRole("radio", { name: "Strafferettslig vurdering" }));
    expect(screen.queryByLabelText("Endelig resultat")).toBeNull();
    expect(screen.getByLabelText("Beslutning i forvaltningen")).toHaveProperty(
      "value",
      "SAKEN_SKAL_VURDERES_FOR_ANMELDELSE",
    );
    const belop = screen.getByLabelText("Endelig beløp for ytelsen 1 (SYKEPENGER)");
    expect(belop.hasAttribute("required")).toBe(true);
  });

  it("krever endelig beløp når saken avsluttes som ordinær feilutbetalingssak", async () => {
    const ytelseId = "00000000-0000-4000-8000-000000000001";
    await visModal("FLYTT_TIL_NESTE_STEG", {
      ...basisHandlinger,
      tilstand: {
        ...basisHandlinger.tilstand,
        steg: "FORVALTNING",
        resultat: {
          forvaltning: {
            type: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
            endeligUtfall: { type: "FEILUTBETALINGSSAK_ORDINAER" },
          },
        },
        ytelser: [
          {
            id: ytelseId,
            type: "SYKEPENGER",
            periodeFra: null,
            periodeTil: null,
            belop: null,
            endeligBelop: null,
          },
        ],
      },
      tillatteSteg: [],
      muligeNesteSteg: ["AVSLUTTET"],
      paakrevdeRegistreringerPerSteg: {
        AVSLUTTET: [
          "forvaltning.type",
          "forvaltning.endeligUtfall.type",
          "ytelser[].endeligBelop ved FEILUTBETALINGSSAK_ORDINAER",
        ],
      },
      feltskjema: [
        {
          felt: "forvaltning.endeligUtfall.type",
          etikett: "Endelig resultat",
          datatype: "enum",
          paakrevd: false,
          verdier: [
            { verdi: "FEILUTBETALINGSSAK_ORDINAER", etikett: "Feilutbetalingssak, ordinær" },
          ],
        },
        {
          felt: "ytelser[].endeligBelop",
          etikett: "Endelig beløp for ytelsen",
          datatype: "belop",
          paakrevd: false,
          verdier: [],
        },
      ],
    });

    fireEvent.click(screen.getByRole("radio", { name: "Avsluttet" }));
    const belop = screen.getByLabelText("Endelig beløp for ytelsen 1 (SYKEPENGER)");
    expect(belop.hasAttribute("required")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Fortsett" }));
    expect(screen.queryByRole("button", { name: "Bekreft" })).toBeNull();
    fireEvent.change(belop, { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Fortsett" }));
    fireEvent.click(screen.getByRole("button", { name: "Bekreft" }));
    await waitFor(() => expect(submitMock).toHaveBeenCalledOnce());
    const formData = submitMock.mock.calls[0]?.[0] as FormData;
    expect(formData.get(`ytelse.${ytelseId}.endeligBelop`)).toBe("0");
  });

  it("flytter fra Opprettet uten å kreve resultat", async () => {
    await visModal("FLYTT_TIL_NESTE_STEG", {
      ...basisHandlinger,
      tilstand: { ...basisHandlinger.tilstand, steg: "OPPRETTET", status: null },
      tillatteSteg: ["UTREDNING"],
      muligeNesteSteg: ["UTREDNING"],
      tillatteResultater: [],
      feltskjema: [],
    });
    fireEvent.click(screen.getByRole("radio", { name: "Utredning" }));
    fireEvent.click(screen.getByRole("button", { name: "Fortsett" }));
    fireEvent.click(screen.getByRole("button", { name: "Bekreft" }));
    await waitFor(() => expect(submitMock).toHaveBeenCalledOnce());
    const formData = submitMock.mock.calls[0]?.[0] as FormData;
    expect(formData.get("registrerResultat")).toBe("false");
  });

  it("viser ikke Avsluttet fra Forvaltning når endelig resultat ikke er tillatt", async () => {
    await visModal("FLYTT_TIL_NESTE_STEG", {
      ...basisHandlinger,
      tilstand: {
        ...basisHandlinger.tilstand,
        steg: "FORVALTNING",
        resultat: {
          forvaltning: {
            type: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
            endeligUtfall: { type: "ANMELDT" },
          },
        },
      },
      tillatteSteg: ["AVSLUTTET"],
      feltskjema: [
        {
          felt: "forvaltning.endeligUtfall.type",
          etikett: "Endelig resultat",
          datatype: "enum",
          paakrevd: false,
          verdier: [
            { verdi: "HENLAGT", etikett: "Henlagt" },
            { verdi: "KONTROLLNOTAT", etikett: "Kontrollnotat" },
            { verdi: "FEILUTBETALINGSSAK_ORDINAER", etikett: "Feilutbetalingssak, ordinær" },
          ],
        },
      ],
    });

    expect(screen.queryByRole("radio", { name: "Avsluttet" })).toBeNull();
  });

  it("viser bare Avsluttet fra Forvaltning etter henleggelse", async () => {
    await visModal("FLYTT_TIL_NESTE_STEG", {
      ...basisHandlinger,
      tilstand: {
        ...basisHandlinger.tilstand,
        steg: "FORVALTNING",
        resultat: {
          forvaltning: {
            type: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
            endeligUtfall: { type: "HENLAGT", henleggelsesarsak: "IKKE_KAPASITET" },
          },
        },
      },
      tillatteSteg: ["STRAFFERETTSLIG_VURDERING", "AVSLUTTET"],
      feltskjema: [
        {
          felt: "forvaltning.endeligUtfall.type",
          etikett: "Endelig resultat",
          datatype: "enum",
          paakrevd: false,
          verdier: [{ verdi: "HENLAGT", etikett: "Henlagt" }],
        },
        {
          felt: "forvaltning.endeligUtfall.henleggelsesarsak",
          etikett: "Årsak",
          datatype: "enum",
          paakrevd: false,
          verdier: [{ verdi: "IKKE_KAPASITET", etikett: "Ikke kapasitet" }],
        },
      ],
    });

    expect(screen.getByRole("radio", { name: "Avsluttet" })).toBeDefined();
    expect(screen.queryByRole("radio", { name: "Strafferettslig vurdering" })).toBeNull();
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

  it("viser registrert resultat når det åpnes for endring", async () => {
    await visModal("REGISTRER_RESULTAT", {
      ...basisHandlinger,
      tilstand: {
        ...basisHandlinger.tilstand,
        resultat: {
          utredning: {
            type: "HENLAGT",
            henleggelsesarsak: "IKKE_TILSTREKKELIG_SKYLD",
          },
        },
      },
    });

    expect(screen.getByLabelText("Resultat fra utredningen")).toHaveProperty("value", "HENLAGT");
    expect(screen.getByLabelText("Årsak til henleggelse")).toHaveProperty(
      "value",
      "IKKE_TILSTREKKELIG_SKYLD",
    );
  });

  it("viser lagret endelig utfall fra forvaltningen", async () => {
    await visModal("REGISTRER_RESULTAT", {
      ...basisHandlinger,
      tilstand: {
        ...basisHandlinger.tilstand,
        steg: "FORVALTNING",
        resultat: {
          forvaltning: { type: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE" },
          endeligUtfall: { type: "KONTROLLNOTAT" },
        },
      },
      feltskjema: [
        {
          felt: "forvaltning.type",
          etikett: "Forvaltningens vurdering",
          datatype: "enum",
          paakrevd: true,
          verdier: [
            {
              verdi: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
              etikett: "Saken skal ikke vurderes for anmeldelse",
            },
          ],
        },
        {
          felt: "forvaltning.endeligUtfall.type",
          etikett: "Endelig resultat",
          datatype: "enum",
          paakrevd: false,
          paakrevdNar: "forvaltning.type=SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
          verdier: [{ verdi: "KONTROLLNOTAT", etikett: "Kontrollnotat" }],
        },
      ],
    });

    expect(screen.getByLabelText("Endelig resultat")).toHaveProperty("value", "KONTROLLNOTAT");
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
