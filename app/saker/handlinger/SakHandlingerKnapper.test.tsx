import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import type { KontrollsakResponse, TillatteHandlingerResponse } from "~/saker/types.backend";
import { SakHandlingerKnapper } from "./SakHandlingerKnapper";

vi.mock("~/auth/innlogget-bruker", () => ({
  useInnloggetBruker: () => ({
    navIdent: "Z999999",
    name: "Test Saksbehandler",
    enhet: "4812",
  }),
}));

function lagKontrollsak(overrides: Partial<KontrollsakResponse> = {}): KontrollsakResponse {
  return {
    id: 101,
    personIdent: "10987654321",
    personNavn: "Ola Nordmann",
    saksbehandlere: {
      eier: { navIdent: "Z123456", navn: "Ola Saksbehandler", enhet: "4812" },
      deltMed: [],
      opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
    },
    steg: "UTREDES",
    status: null,
    kategori: "ARBEID",
    kilde: "NAV_KONTROLL",
    misbruktype: [],
    prioritet: "NORMAL",
    ytelser: [
      {
        type: "Sykepenger",
        periodeFra: "2026-01-01",
        periodeTil: "2026-01-31",
        belop: null,
        endeligBelop: null,
      },
    ],
    merking: [],
    arbeidsgivere: [],
    opprettet: "2026-02-03T10:11:12Z",
    oppdatert: null,
    oppgaver: [],
    kobledeSaker: [],
    dokumenter: [],
    adresseskjermet: false,
    gjeldendePersonIdent: null,
    historiskeIdenter: [],
    ...overrides,
  };
}

function lagTillatteHandlinger(sak: KontrollsakResponse): TillatteHandlingerResponse {
  return {
    versjon: 1,
    tilstand: {
      steg: sak.steg,
      status: sak.status,
      statusFørBero: sak.status === "I_BERO" ? "AKTIV" : null,
      resultat: null,
      ytelser: sak.ytelser.map((ytelse, indeks) => ({
        ...ytelse,
        id:
          ytelse.id ??
          `00000000-0000-4000-8000-${(sak.id + indeks).toString(16).padStart(12, "0")}`,
      })),
    },
    handlinger:
      sak.steg === "AVSLUTTET"
        ? []
        : [
            {
              type: "FLYTT_TIL_NESTE_STEG",
              metode: "POST",
              sti: `/api/v1/kontrollsaker/${sak.id}/steg`,
            },
            {
              type: "ENDRE_STATUS",
              metode: "POST",
              sti: `/api/v1/kontrollsaker/${sak.id}/status`,
            },
          ],
    tillatteSteg: ["UTREDNING"],
    tillatteStatuser: ["AKTIV", "I_BERO"],
    tillatteResultater: [],
    paakrevdeRegistreringer: [],
    paakrevdeRegistreringerPerSteg: {},
    feltskjema: [],
  };
}

function renderMedRouter(ui: React.ReactNode) {
  const router = createMemoryRouter([{ path: "/", element: ui }], {
    initialEntries: ["/"],
  });

  return render(<RouterProvider router={router} />);
}

describe("SakHandlingerKnapper", () => {
  it("viser stegbytte når resultatet kan registreres i flyttemodalen", () => {
    const sak = lagKontrollsak({ steg: "UTREDNING", status: "AKTIV" });
    const tillatte = lagTillatteHandlinger(sak);
    renderMedRouter(
      <SakHandlingerKnapper
        erEier={true}
        sak={sak}
        tillatteHandlinger={{
          ...tillatte,
          tillatteSteg: [],
          muligeNesteSteg: ["FORVALTNING"],
          tilstand: { ...tillatte.tilstand, resultat: null },
        }}
        filer={[]}
        dokumenter={[]}
      />,
    );
    expect(screen.getByRole("button", { name: "Flytt til neste steg" })).toBeDefined();
  });

  it("viser bare stegbytte og resultatendring etter henleggelse i Forvaltning", () => {
    const sak = lagKontrollsak({ steg: "FORVALTNING", status: "VENTER_PA_VEDTAK" });
    const tillatte = lagTillatteHandlinger(sak);
    renderMedRouter(
      <SakHandlingerKnapper
        erEier={true}
        sak={sak}
        tillatteHandlinger={{
          ...tillatte,
          tilstand: {
            ...tillatte.tilstand,
            resultat: {
              forvaltning: {
                type: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
                endeligUtfall: { type: "HENLAGT", henleggelsesarsak: "IKKE_KAPASITET" },
              },
            },
          },
          tillatteSteg: ["AVSLUTTET"],
          handlinger: [
            ...tillatte.handlinger,
            { type: "HENLEGG", metode: "PUT", sti: `/api/v1/kontrollsaker/${sak.id}/resultat` },
            {
              type: "REGISTRER_RESULTAT",
              metode: "PUT",
              sti: `/api/v1/kontrollsaker/${sak.id}/resultat`,
            },
          ],
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
        }}
        filer={[]}
        dokumenter={[]}
      />,
    );

    expect(screen.getByRole("button", { name: "Flytt til neste steg" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Registrer resultat" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Registrer henleggelse" })).toBeNull();
  });

  it("viser ikke stegbytte fra Forvaltning når sluttresultatet ikke er tillatt", () => {
    const sak = lagKontrollsak({ steg: "FORVALTNING" });
    const handlinger: TillatteHandlingerResponse = {
      ...lagTillatteHandlinger(sak),
      tilstand: {
        ...lagTillatteHandlinger(sak).tilstand,
        steg: "FORVALTNING",
        resultat: {
          forvaltning: {
            type: "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE",
            endeligUtfall: { type: "ANMELDT" },
          },
        },
        ytelser: lagTillatteHandlinger(sak).tilstand.ytelser.map((ytelse) => ({
          ...ytelse,
          endeligBelop: 0,
        })),
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
    };

    renderMedRouter(
      <SakHandlingerKnapper
        erEier={true}
        sak={sak}
        tillatteHandlinger={handlinger}
        filer={[]}
        dokumenter={[]}
      />,
    );

    expect(screen.queryByRole("button", { name: "Flytt til neste steg" })).toBeNull();
  });

  it("viser ingen handlinger for AVSLUTTET sak", () => {
    renderMedRouter(
      <SakHandlingerKnapper
        erEier={true}
        sak={lagKontrollsak({ steg: "AVSLUTTET" })}
        tillatteHandlinger={lagTillatteHandlinger(lagKontrollsak({ steg: "AVSLUTTET" }))}
        filer={[]}
        dokumenter={[]}
      />,
    );

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("viser Endre steg for aktiv ikke-blokkert sak med eier", () => {
    renderMedRouter(
      <SakHandlingerKnapper
        erEier={true}
        sak={lagKontrollsak({ steg: "UTREDES", status: null })}
        tillatteHandlinger={lagTillatteHandlinger(
          lagKontrollsak({ steg: "UTREDES", status: null }),
        )}
        filer={[]}
        dokumenter={[]}
      />,
    );

    expect(screen.getByRole("button", { name: "Flytt til neste steg" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Endre status" })).toBeDefined();
    expect(screen.getByRole("separator")).toBeDefined();
    expect(screen.getByRole("button", { name: "Opprett journalpost" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Opprett oppgave" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Stans ytelse" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Gjenoppta" })).toBeNull();
  });

  it("viser bare Endre steg for sak med steg Opprettet", () => {
    renderMedRouter(
      <SakHandlingerKnapper
        erEier={true}
        sak={lagKontrollsak({ steg: "OPPRETTET", status: null })}
        tillatteHandlinger={lagTillatteHandlinger(
          lagKontrollsak({ steg: "OPPRETTET", status: null }),
        )}
        filer={[]}
        dokumenter={[]}
      />,
    );

    expect(screen.getByRole("button", { name: "Flytt til neste steg" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Opprett journalpost" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Opprett oppgave" })).toBeNull();
  });

  it("viser statusendring og øvrige handlinger for blokkert sak med eier", () => {
    renderMedRouter(
      <SakHandlingerKnapper
        erEier={true}
        sak={lagKontrollsak({ steg: "UTREDES", status: "VENTER_PA_INFORMASJON" })}
        tillatteHandlinger={lagTillatteHandlinger(
          lagKontrollsak({ steg: "UTREDES", status: "VENTER_PA_INFORMASJON" }),
        )}
        filer={[]}
        dokumenter={[]}
      />,
    );

    expect(screen.getByRole("button", { name: "Endre status" })).toBeDefined();
    expect(screen.getByRole("separator")).toBeDefined();
    expect(screen.getByRole("button", { name: "Opprett journalpost" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Opprett oppgave" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Flytt til neste steg" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Sett på vent" })).toBeNull();
  });

  it("viser ingen handlinger for eierløs sak når bruker ikke er eier", () => {
    renderMedRouter(
      <SakHandlingerKnapper
        erEier={false}
        filer={[]}
        dokumenter={[]}
        tillatteHandlinger={lagTillatteHandlinger(
          lagKontrollsak({
            steg: "OPPRETTET",
            saksbehandlere: {
              eier: null,
              deltMed: [],
              opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
            },
          }),
        )}
        sak={lagKontrollsak({
          steg: "OPPRETTET",
          saksbehandlere: {
            eier: null,
            deltMed: [],
            opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
          },
        })}
      />,
    );

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("viser ingen handlinger for eierløs blokkert sak når bruker ikke er eier", () => {
    renderMedRouter(
      <SakHandlingerKnapper
        erEier={false}
        filer={[]}
        dokumenter={[]}
        tillatteHandlinger={lagTillatteHandlinger(
          lagKontrollsak({
            steg: "OPPRETTET",
            status: "I_BERO",
            saksbehandlere: {
              eier: null,
              deltMed: [],
              opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
            },
          }),
        )}
        sak={lagKontrollsak({
          steg: "OPPRETTET",
          status: "I_BERO",
          saksbehandlere: {
            eier: null,
            deltMed: [],
            opprettetAv: { navIdent: "Z654321", navn: "Kari Oppretter", enhet: "4812" },
          },
        })}
      />,
    );

    expect(screen.queryByRole("button")).toBeNull();
  });
});
