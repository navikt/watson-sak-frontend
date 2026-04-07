import { BACKEND_API_URL, skalBrukeMockdata } from "~/config/env.server";
import { logger } from "~/logging/logging";
import { leggTilMockSak } from "./person-oppslag.mock.server";

export type OpprettKontrollsakRequest = {
  personIdent: string;
  saksbehandler: string;
  mottakEnhet: string;
  mottakSaksbehandler: string;
  kategori: string;
  prioritet: string;
  misbruktype?: string;
  merking?: string;
  ytelser: Array<{
    type: string;
    periodeFra: string;
    periodeTil: string;
  }>;
  enhet: string;
  kilde: string;
  caBeløp?: number;
  organisasjonsnummer?: string;
};

type OpprettKontrollsakArgs = {
  token: string;
  payload: OpprettKontrollsakRequest;
};

export async function opprettKontrollsak({
  token,
  payload,
}: OpprettKontrollsakArgs): Promise<void> {
  if (skalBrukeMockdata) {
    leggTilMockSak(payload.personIdent, payload.saksbehandler, payload.enhet);
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
