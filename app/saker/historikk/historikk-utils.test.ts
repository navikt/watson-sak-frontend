import { describe, expect, it } from "vitest";
import { GavelIcon } from "@navikt/aksel-icons";
import type { SakHendelse } from "./typer";
import {
  HendelseBullet,
  hendelseBeskrivelse,
  hendelseTittel,
  lagForrigeHendelseKart,
} from "./historikk-utils";

function lagHendelse(overrides: Partial<SakHendelse>): SakHendelse {
  return {
    hendelseId: "00000000-0000-0000-0000-000000000001",
    tidspunkt: "2025-01-01T12:00:00Z",
    hendelsesType: "STATUS_ENDRET",
    sakId: 1,
    steg: "UTREDNING",
    ytelseTyper: [],
    ...overrides,
  };
}

describe("hendelseBeskrivelse", () => {
  it("viser hvilke felter som ble endret for SAKSINFORMASJON_ENDRET", () => {
    const hendelse = lagHendelse({
      hendelsesType: "SAKSINFORMASJON_ENDRET",
      beskrivelse: "Endret kategori og ytelser.",
    });

    expect(hendelseBeskrivelse(hendelse)).toBe("Endret kategori og ytelser.");
  });

  describe("aktør i historikk", () => {
    it("beholder aktørnavnet separat fra hendelsesbeskrivelsen", () => {
      const hendelse = lagHendelse({
        opprettetAvNavn: "Ola Nordmann",
        beskrivelse: "Sak opprettet",
      });

      expect(hendelse.opprettetAvNavn).toBe("Ola Nordmann");
      expect(hendelseBeskrivelse(hendelse)).toContain("Sak opprettet");
    });
  });

  it("faller tilbake til status for SAKSINFORMASJON_ENDRET uten beskrivelse", () => {
    const hendelse = lagHendelse({ hendelsesType: "SAKSINFORMASJON_ENDRET" });

    expect(hendelseBeskrivelse(hendelse)).toBe("Steg: Utredning");
  });

  it("viser journalposttype i stedet for duplisert beskrivelse", () => {
    const hendelse = lagHendelse({
      hendelsesType: "JOURNALPOST_OPPRETTET",
      tittel: "UTGAAENDE",
      beskrivelse: "Journalpost opprettet",
    });

    expect(hendelseBeskrivelse(hendelse)).toBe("Type: Utgående");
  });

  it("viser lesbar oppgavetype i stedet for rå hendelsestype", () => {
    const hendelse = lagHendelse({
      hendelsesType: "OPPGAVE_OPPRETTET",
      tittel: "VUR",
      beskrivelse: "OPPGAVE_OPPRETTET",
    });

    expect(hendelseBeskrivelse(hendelse)).toBe("Type: Vurder dokument");
  });

  it("viser hvilke saksdetaljer som ble oppdatert", () => {
    const hendelse = lagHendelse({
      hendelsesType: "SAK_REDIGERT",
      beskrivelse: "Endret: kategori, prioritet",
    });

    expect(hendelseBeskrivelse(hendelse)).toBe("Endret: kategori, prioritet");
  });

  it("viser ikke steg som fallback når saksdetaljer mangler beskrivelse", () => {
    const hendelse = lagHendelse({ hendelsesType: "SAK_REDIGERT" });

    expect(hendelseBeskrivelse(hendelse)).toBeNull();
  });
});

describe("hendelseTittel", () => {
  it("viser lesbar tittel når saksdetaljer er redigert", () => {
    const hendelse = lagHendelse({ hendelsesType: "SAK_REDIGERT" });

    expect(hendelseTittel(hendelse)).toBe("Saksdetaljer oppdatert");
  });

  it("viser redigering av historikkinnslag uten ukjent steg", () => {
    const hendelse = lagHendelse({
      hendelsesType: "MANUELL_HENDELSE_REDIGERT",
      steg: null,
      beskrivelse: "Historikkinnslag redigert",
    });

    expect(hendelseTittel(hendelse)).toBe("Historikkinnslag redigert");
    expect(hendelseBeskrivelse(hendelse)).toBeNull();
  });

  it.each([
    ["MIGRERING_PABEGYNT", "Migrering påbegynt"],
    ["MIGRERING_FULLFORT", "Migrering fullført"],
  ])("viser %s som «%s» uten steg", (hendelsesType, tittel) => {
    const hendelse = lagHendelse({ hendelsesType, beskrivelse: tittel });

    expect(hendelseTittel(hendelse)).toBe(tittel);
    expect(hendelseBeskrivelse(hendelse)).toBeNull();
  });
});

describe("snapshot av steg og status", () => {
  it.each([
    ["SAK_OPPRETTET", "Sak opprettet"],
    ["SAK_TILDELT", "Sak tildelt"],
  ])("viser riktig steg for %s", (hendelsesType, forventetTittel) => {
    const hendelse = lagHendelse({
      hendelsesType,
      steg: "OPPRETTET",
      status: "AKTIV",
    });

    expect(hendelseTittel(hendelse)).toBe(forventetTittel);
    expect(hendelseBeskrivelse(hendelse)).toBe("Steg: Opprettet");
  });
});

describe("HendelseBullet", () => {
  it("viser gavelikon for historisk ANMELDT-statusendring", () => {
    const ikon = HendelseBullet({
      hendelse: lagHendelse({
        hendelsesType: "SAK_STATUS_ENDRET",
        steg: "ANMELDT",
      }),
    });

    expect(ikon.type).toBe(GavelIcon);
  });
});

describe("SAK_STATUS_ENDRET (generisk hendelse fra backend for status- og arbeidsstatusendring)", () => {
  it("viser påklaget status med riktig tittel", () => {
    const forrigeHendelse = lagHendelse({
      hendelsesType: "SAK_STATUS_ENDRET",
      status: "AKTIV",
    });
    const hendelse = lagHendelse({
      hendelsesType: "SAK_STATUS_ENDRET",
      status: "PAAKLAGET",
    });

    expect(hendelseTittel(hendelse, forrigeHendelse)).toBe("Sak påklaget");
  });

  it("behandler manglende status og AKTIV som samme arbeidsstatus ved stegbytte", () => {
    const hendelser: SakHendelse[] = [
      lagHendelse({
        hendelseId: "00000000-0000-0000-0000-000000000002",
        hendelsesType: "SAK_STATUS_ENDRET",
        steg: "UTREDNING",
        status: "AKTIV",
        beskrivelse: "Sakens status eller steg endret",
        tidspunkt: "2025-01-02T12:00:00Z",
      }),
      lagHendelse({
        hendelseId: "00000000-0000-0000-0000-000000000001",
        hendelsesType: "SAK_OPPRETTET",
        steg: "OPPRETTET",
        status: null,
        tidspunkt: "2025-01-01T12:00:00Z",
      }),
    ];
    const forrigeHendelse = lagForrigeHendelseKart(hendelser).get(hendelser[0].hendelseId);

    expect(hendelseTittel(hendelser[0], forrigeHendelse)).toBe("Sak til utredning");
    expect(hendelseBeskrivelse(hendelser[0], forrigeHendelse)).toBe("Steg: Utredning");
  });

  it("hopper over hendelser uten snapshot ved sammenligning", () => {
    const hendelser: SakHendelse[] = [
      lagHendelse({
        hendelseId: "00000000-0000-0000-0000-000000000003",
        hendelsesType: "SAK_STATUS_ENDRET",
        steg: "UTREDNING",
        status: "I_BERO",
        tidspunkt: "2025-01-03T12:00:00Z",
      }),
      lagHendelse({
        hendelseId: "00000000-0000-0000-0000-000000000002",
        hendelsesType: "MANUELL_HENDELSE",
        steg: null,
        status: null,
        tidspunkt: "2025-01-02T12:00:00Z",
      }),
      lagHendelse({
        hendelseId: "00000000-0000-0000-0000-000000000001",
        hendelsesType: "SAK_STATUS_ENDRET",
        steg: "UTREDNING",
        status: "AKTIV",
        tidspunkt: "2025-01-01T12:00:00Z",
      }),
    ];
    const forrigeHendelse = lagForrigeHendelseKart(hendelser).get(hendelser[0].hendelseId);

    expect(forrigeHendelse?.hendelseId).toBe("00000000-0000-0000-0000-000000000001");
    expect(hendelseTittel(hendelser[0], forrigeHendelse)).toBe("Sak satt i bero");
  });

  it("bruker forrige hendelse i lista til å avgjøre hva som faktisk endret seg", () => {
    const hendelser: SakHendelse[] = [
      lagHendelse({
        hendelseId: "00000000-0000-0000-0000-000000000002",
        hendelsesType: "SAK_STATUS_ENDRET",
        steg: "UTREDNING",
        status: "I_BERO",
        tidspunkt: "2025-01-02T12:00:00Z",
      }),
      lagHendelse({
        hendelseId: "00000000-0000-0000-0000-000000000001",
        hendelsesType: "SAK_STATUS_ENDRET",
        steg: "UTREDNING",
        status: null,
        tidspunkt: "2025-01-01T12:00:00Z",
      }),
    ];
    const kart = lagForrigeHendelseKart(hendelser);
    const forrigeHendelse = kart.get(hendelser[0].hendelseId);

    expect(hendelseTittel(hendelser[0], forrigeHendelse)).toBe("Sak satt i bero");
    expect(hendelseBeskrivelse(hendelser[0], forrigeHendelse)).toBe(
      "Status: I bero\nSteg: Utredning",
    );
  });

  it("viser statusendring uten forrigeHendelse som om alt er endret (bakoverkompatibelt)", () => {
    const hendelse = lagHendelse({ hendelsesType: "SAK_STATUS_ENDRET", steg: "POLITI" });

    expect(hendelseTittel(hendelse)).toBe("Sak politi");
    expect(hendelseBeskrivelse(hendelse)).toBe("Steg: Politi");
  });

  it("viser både status- og arbeidsstatusendring samtidig", () => {
    const hendelser: SakHendelse[] = [
      lagHendelse({
        hendelseId: "00000000-0000-0000-0000-000000000002",
        hendelsesType: "SAK_STATUS_ENDRET",
        steg: "AVSLUTTET",
        status: null,
        tidspunkt: "2025-01-02T12:00:00Z",
      }),
      lagHendelse({
        hendelseId: "00000000-0000-0000-0000-000000000001",
        hendelsesType: "SAK_STATUS_ENDRET",
        steg: "UTREDES",
        status: "VENTER_PA_VEDTAK",
        tidspunkt: "2025-01-01T12:00:00Z",
      }),
    ];
    const kart = lagForrigeHendelseKart(hendelser);
    const forrigeHendelse = kart.get(hendelser[0].hendelseId);

    expect(hendelseTittel(hendelser[0], forrigeHendelse)).toBe("Sak avsluttet");
  });

  it("viser ingen statusendring når kun steg endres", () => {
    const hendelser: SakHendelse[] = [
      lagHendelse({
        hendelseId: "00000000-0000-0000-0000-000000000002",
        hendelsesType: "SAK_STATUS_ENDRET",
        steg: "AVSLUTTET",
        status: null,
        tidspunkt: "2025-01-02T12:00:00Z",
      }),
      lagHendelse({
        hendelseId: "00000000-0000-0000-0000-000000000001",
        hendelsesType: "SAK_STATUS_ENDRET",
        steg: "UTREDNING",
        status: null,
        tidspunkt: "2025-01-01T12:00:00Z",
      }),
    ];
    const kart = lagForrigeHendelseKart(hendelser);
    const forrigeHendelse = kart.get(hendelser[0].hendelseId);

    expect(hendelseTittel(hendelser[0], forrigeHendelse)).toBe("Sak avsluttet");
    expect(hendelseBeskrivelse(hendelser[0], forrigeHendelse)).toBe("Steg: Avsluttet");
  });

  it("skiller aktiv status fra sakens steg", () => {
    const hendelser: SakHendelse[] = [
      lagHendelse({
        hendelseId: "00000000-0000-0000-0000-000000000002",
        hendelsesType: "SAK_STATUS_ENDRET",
        steg: "UTREDNING",
        status: "AKTIV",
        tidspunkt: "2025-01-02T12:00:00Z",
      }),
      lagHendelse({
        hendelseId: "00000000-0000-0000-0000-000000000001",
        hendelsesType: "SAK_STATUS_ENDRET",
        steg: "UTREDNING",
        status: "I_BERO",
        tidspunkt: "2025-01-01T12:00:00Z",
      }),
    ];
    const forrigeHendelse = lagForrigeHendelseKart(hendelser).get(hendelser[0].hendelseId);

    expect(hendelseTittel(hendelser[0], forrigeHendelse)).toBe("Sak tatt ut av bero");
    expect(hendelseBeskrivelse(hendelser[0], forrigeHendelse)).toBe(
      "Status: Aktiv\nSteg: Utredning",
    );
  });

  it("viser overgang til forvaltning med status og steg på hver sin linje", () => {
    const hendelser: SakHendelse[] = [
      lagHendelse({
        hendelseId: "00000000-0000-0000-0000-000000000002",
        hendelsesType: "SAK_STATUS_ENDRET",
        steg: "FORVALTNING",
        status: "VENTER_PA_VEDTAK",
        beskrivelse: "Sakens status eller steg endret",
        tidspunkt: "2025-01-02T12:00:00Z",
      }),
      lagHendelse({
        hendelseId: "00000000-0000-0000-0000-000000000001",
        hendelsesType: "SAK_STATUS_ENDRET",
        steg: "UTREDNING",
        status: "AKTIV",
        tidspunkt: "2025-01-01T12:00:00Z",
      }),
    ];
    const forrigeHendelse = lagForrigeHendelseKart(hendelser).get(hendelser[0].hendelseId);

    expect(hendelseTittel(hendelser[0], forrigeHendelse)).toBe("Sak til forvaltning");
    expect(hendelseBeskrivelse(hendelser[0], forrigeHendelse)).toBe(
      "Status: Venter på vedtak\nSteg: Forvaltning",
    );
  });

  it("viser overgang til strafferettslig vurdering med riktig tittel", () => {
    const hendelser: SakHendelse[] = [
      lagHendelse({
        hendelseId: "00000000-0000-0000-0000-000000000002",
        hendelsesType: "SAK_STATUS_ENDRET",
        steg: "STRAFFERETTSLIG_VURDERING",
        status: "AKTIV",
        tidspunkt: "2025-01-02T12:00:00Z",
      }),
      lagHendelse({
        hendelseId: "00000000-0000-0000-0000-000000000001",
        hendelsesType: "SAK_STATUS_ENDRET",
        steg: "FORVALTNING",
        status: "VENTER_PA_VEDTAK",
        tidspunkt: "2025-01-01T12:00:00Z",
      }),
    ];
    const forrigeHendelse = lagForrigeHendelseKart(hendelser).get(hendelser[0].hendelseId);

    expect(hendelseTittel(hendelser[0], forrigeHendelse)).toBe("Sak til strafferettslig vurdering");
    expect(hendelseBeskrivelse(hendelser[0], forrigeHendelse)).toBe(
      "Status: Aktiv\nSteg: Strafferettslig vurdering",
    );
  });
});

describe("filhendelser", () => {
  it("hendelseTittel returnerer 'Fil slettet' for FIL_SLETTET", () => {
    const hendelse = lagHendelse({ hendelsesType: "FIL_SLETTET", status: null });
    expect(hendelseTittel(hendelse)).toBe("Fil slettet");
  });

  it("hendelseTittel returnerer 'Fil åpnet' for FIL_ÅPNET", () => {
    const hendelse = lagHendelse({ hendelsesType: "FIL_ÅPNET", status: null });
    expect(hendelseTittel(hendelse)).toBe("Fil åpnet");
  });

  it("hendelseTittel returnerer 'Filnavn endret' for FIL_OMDØPT", () => {
    const hendelse = lagHendelse({ hendelsesType: "FIL_OMDØPT", status: null });
    expect(hendelseTittel(hendelse)).toBe("Filnavn endret");
    expect(hendelseBeskrivelse(hendelse)).toBeNull();
  });

  it("hendelseTittel returnerer 'Fil arkivert' for FIL_ARKIVERT", () => {
    const hendelse = lagHendelse({ hendelsesType: "FIL_ARKIVERT", status: null });
    expect(hendelseTittel(hendelse)).toBe("Fil arkivert");
  });

  it("hendelseBeskrivelse returnerer beskrivelse fra hendelsen for FIL_ARKIVERT", () => {
    const hendelse = lagHendelse({
      hendelsesType: "FIL_ARKIVERT",
      status: null,
      beskrivelse: "Arkivert på journalpost 12345",
    });
    expect(hendelseBeskrivelse(hendelse)).toBe("Arkivert på journalpost 12345");
  });

  it("hendelseBeskrivelse returnerer null for FIL_LASTET_OPP uten beskrivelse", () => {
    const hendelse = lagHendelse({ hendelsesType: "FIL_LASTET_OPP", status: null });
    expect(hendelseBeskrivelse(hendelse)).toBeNull();
  });

  it("hendelseBeskrivelse returnerer null for FIL_SLETTET", () => {
    const hendelse = lagHendelse({ hendelsesType: "FIL_SLETTET", status: null });
    expect(hendelseBeskrivelse(hendelse)).toBeNull();
  });

  it("hendelseBeskrivelse returnerer null for FIL_ÅPNET", () => {
    const hendelse = lagHendelse({ hendelsesType: "FIL_ÅPNET", status: null });
    expect(hendelseBeskrivelse(hendelse)).toBeNull();
  });

  it("hendelseBeskrivelse returnerer beskrivelse fra hendelsen for FIL_LASTET_OPP med beskrivelse", () => {
    const hendelse = lagHendelse({
      hendelsesType: "FIL_LASTET_OPP",
      status: null,
      beskrivelse: "Virusskanning OK",
    });
    expect(hendelseBeskrivelse(hendelse)).toBe("Virusskanning OK");
  });
});
