import { BACKEND_API_URL, skalBrukeMockdata } from "~/config/env.server";
import { logger } from "~/logging/logging";
import type { KontrollsakKategori, KontrollsakKilde, KontrollsakMisbrukstype } from "~/saker/types.backend";
import { leggTilMockSak } from "./person-oppslag.mock.server";
import { leggTilMockMineSak } from "~/testing/mock-store/saker/mine-saker.server";

export type OpprettKontrollsakRequest = {
  personIdent: string;
  personNavn: string;
  saksbehandlere?: {
    eier?: {
      navIdent: string;
      navn: string;
      enhet?: string;
    } | null;
    deltMed?: Array<{
      navIdent: string;
      navn: string;
      enhet?: string;
    }>;
  };
  kategori: string;
  kilde: string;
  misbruktype: string[];
  prioritet: string;
  merking?: string;
  ytelser: Array<{
    type: string;
    periodeFra: string;
    periodeTil: string;
    belop?: number;
  }>;
};

type OpprettKontrollsakArgs = {
  token: string;
  payload: OpprettKontrollsakRequest;
};

type KontrollsakPrioritet = "LAV" | "NORMAL" | "HOY";

function erGyldigKategori(verdi: string): verdi is KontrollsakKategori {
  return ["BEHANDLER", "ARBEID", "SAMLIV", "UTLAND", "IDENTITET", "TILTAK", "DOKUMENTFALSK", "ANNET"].includes(verdi);
}

function erGyldigKilde(verdi: string): verdi is KontrollsakKilde {
  return ["NAV_KONTROLL", "ANNET", "PUBLIKUM", "POLITIET"].includes(verdi);
}

function erGyldigPrioritet(verdi: string): verdi is KontrollsakPrioritet {
  return ["LAV", "NORMAL", "HOY"].includes(verdi);
}

function erGyldigeMisbrukstyper(verdier: string[]): verdier is KontrollsakMisbrukstype[] {
  return verdier.every((verdi) =>
    [
      "BEHANDLER_25_7",
      "L_TAKSTER_BEHANDLER",
      "L_TAKSTER_FORETAK",
      "HVIT_INNTEKT",
      "FIKTIVT_ARBEIDSFORHOLD",
      "SKJULT_ARBEIDSINNTEKT",
      "SVART_ARBEID",
      "SKJULT_SAMLIV",
      "ENDRET_SIVILSTATUS",
      "MEDLEMSKAP_BORTFALT",
      "INNENFOR_EOS",
      "UTENFOR_EOS",
      "IDENTITETSMISBRUK",
      "OPPHOLD_PAA_FEIL_GRUNNLAG",
      "MISBRUK_AV_TILTAKSPLASS",
      "AVBRUTT_TILTAK",
    ].includes(verdi),
  );
}

export async function opprettKontrollsak({
  token,
  payload,
}: OpprettKontrollsakArgs): Promise<void> {
  if (skalBrukeMockdata) {
    const saksbehandler =
      payload.saksbehandlere?.eier?.navIdent ??
      payload.saksbehandlere?.deltMed?.[0]?.navIdent ??
      "Ukjent";
    const enhet = payload.saksbehandlere?.eier?.enhet ?? "Ukjent";
    leggTilMockSak(payload.personIdent, saksbehandler, enhet);

    if (
      !erGyldigKategori(payload.kategori) ||
      !erGyldigKilde(payload.kilde) ||
      !erGyldigPrioritet(payload.prioritet) ||
      !erGyldigeMisbrukstyper(payload.misbruktype)
    ) {
      throw new Error("Ugyldig mock-payload for opprettelse av kontrollsak.");
    }

    leggTilMockMineSak({
      personIdent: payload.personIdent,
      personNavn: payload.personNavn,
      saksbehandlere: payload.saksbehandlere,
      kategori: payload.kategori,
      kilde: payload.kilde,
      prioritet: payload.prioritet,
      misbruktype: payload.misbruktype,
      merking: payload.merking,
      ytelser: payload.ytelser,
    });
    return;
  }

  if (!BACKEND_API_URL) {
    throw new Error("Mangler backend-url for opprettelse av kontrollsak.");
  }

  const response = await fetch(`${BACKEND_API_URL}/api/v1/kontrollsaker`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    logger.error("Kunne ikke opprette kontrollsak i Watson Admin API", {
      status: response.status,
    });
    throw new Error("Kunne ikke opprette kontrollsak.");
  }
}
