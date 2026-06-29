import { getBackendOboToken } from "~/auth/access-token";
import { BACKEND_API_URL, skalBrukeMockdata } from "~/config/env.server";
import { logger } from "~/logging/logging";
import { kontrollsakPageResponseSchema } from "~/saker/types.backend";
import type { KontrollsakPageResponse } from "./types.backend";

type KontrollsakerFilter = {
  ansvarligNavIdent?: string;
  status?: string[];
  kategori?: string[];
  misbruktype?: string[];
  ytelseType?: string[];
  merking?: string[];
  blokkert?: string[];
  enhet?: string[];
  utenAnsvarlig?: boolean;
  utenBlokkering?: boolean;
  sortering?: string;
};

type HentKontrollsakerArgs = {
  token: string;
  page: number;
  size: number;
} & KontrollsakerFilter;

function byggKontrollsakerParams(args: HentKontrollsakerArgs): URLSearchParams {
  const params = new URLSearchParams({ page: String(args.page), size: String(args.size) });
  if (args.ansvarligNavIdent) params.set("ansvarligNavIdent", args.ansvarligNavIdent);
  if (args.utenAnsvarlig != null) params.set("utenAnsvarlig", String(args.utenAnsvarlig));
  if (args.utenBlokkering != null) params.set("utenBlokkering", String(args.utenBlokkering));
  for (const v of args.status ?? []) params.append("status", v);
  for (const v of args.kategori ?? []) params.append("kategori", v);
  for (const v of args.misbruktype ?? []) params.append("misbruktype", v);
  for (const v of args.ytelseType ?? []) params.append("ytelseType", v);
  for (const v of args.merking ?? []) params.append("merking", v);
  for (const v of args.blokkert ?? []) params.append("blokkert", v);
  for (const v of args.enhet ?? []) params.append("enhet", v);
  if (args.sortering) params.set("sortering", args.sortering);
  return params;
}

export async function hentKontrollsaker(
  args: HentKontrollsakerArgs,
): Promise<KontrollsakPageResponse> {
  const { token } = args;
  if (!BACKEND_API_URL) {
    throw new Error("Mangler backend-url for henting av kontrollsaker.");
  }

  const params = byggKontrollsakerParams(args);

  const response = await fetch(`${BACKEND_API_URL}/api/v1/kontrollsaker?${params}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    logger.error("Kunne ikke hente kontrollsaker fra Watson Admin API", {
      status: response.status,
    });
    throw new Error("Kunne ikke hente kontrollsaker.");
  }

  const json = await response.json();
  const parsed = kontrollsakPageResponseSchema.safeParse(json);
  if (!parsed.success) {
    logger.error("Schema-validering feilet for hentKontrollsaker", {
      feil: parsed.error.format(),
    });
    throw new Error("Ugyldig svar fra watson-admin-api (hentKontrollsaker)");
  }
  return parsed.data;
}

export async function hentKontrollsakerForFordeling(request: Request) {
  if (skalBrukeMockdata) {
    return null;
  }

  const token = await getBackendOboToken(request);
  return hentKontrollsaker({ token, page: 1, size: 100, utenAnsvarlig: true });
}

type TildelKontrollsakArgs = {
  token: string;
  sakId: string;
  saksbehandler: string;
};

export async function tildelKontrollsak({
  token,
  sakId,
  saksbehandler,
}: TildelKontrollsakArgs): Promise<void> {
  if (!BACKEND_API_URL) {
    throw new Error("Mangler backend-url for tildeling av kontrollsak.");
  }

  const response = await fetch(`${BACKEND_API_URL}/api/v1/kontrollsaker/${sakId}/saksbehandler`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ aksjon: "TILDEL", navIdent: saksbehandler }),
  });

  if (!response.ok) {
    logger.error("Kunne ikke tildele kontrollsak i Watson Admin API", {
      status: response.status,
      sakId,
    });
    throw new Error("Kunne ikke tildele kontrollsak.");
  }
}
