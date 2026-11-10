import { getBackendOboToken } from "~/auth/access-token";
import { kastHvisUtlogget } from "~/auth/session-utløpt.server";
import { BACKEND_API_URL, skalBrukeMockdata } from "~/config/env.server";
import { logger } from "~/logging/logging";
import { BackendUtilgjengeligError } from "~/utils/backend-utilgjengelig.server";
import { kontrollsakPageResponseSchema } from "~/saker/types.backend";
import { data } from "react-router";
import { ANTALL_PER_SIDE } from "~/utils/paginering";
import { ufordelteSakerResponseSchema } from "./types.backend";
import { sti } from "~/saker/sti-param.server";
import type { KontrollsakPageResponse } from "./types.backend";
import type { Aldersvarsel, ANSVARLIG_MEG } from "~/alle-saker/aldersfilter";

type KontrollsakerFilter = {
  ansvarligNavIdent?: string;
  steg?: string[];
  kategori?: string[];
  misbruktype?: string[];
  ytelseType?: string[];
  merking?: string[];
  status?: string[];
  statusSteg?: string[];
  enhet?: string[];
  utenAnsvarlig?: boolean;
  utenStatus?: boolean;
  sortering?: string;
};

type HentKontrollsakerArgs = {
  token: string;
  page: number;
  size: number;
  aldersvarsel?: Aldersvarsel;
  /** «Meg»: backend utleder identen fra tokenet, så identen havner ikke i URL-en. */
  ansvarlig?: typeof ANSVARLIG_MEG;
  /** Saker der innlogget bruker er ansvarlig eller delt med. Identen utledes av backend. */
  tilknyttet?: typeof ANSVARLIG_MEG;
  /** Utelat saker som eies av innlogget bruker. Brukes sammen med tilknyttet=MEG. */
  utelatEgneSaker?: boolean;
} & KontrollsakerFilter;

function byggKontrollsakerParams(args: HentKontrollsakerArgs): URLSearchParams {
  const params = new URLSearchParams({ page: String(args.page), size: String(args.size) });
  if (args.ansvarligNavIdent) params.set("ansvarligNavIdent", args.ansvarligNavIdent);
  if (args.aldersvarsel) params.set("aldersvarsel", args.aldersvarsel);
  if (args.ansvarlig) params.set("ansvarlig", args.ansvarlig);
  if (args.tilknyttet) params.set("tilknyttet", args.tilknyttet);
  if (args.utelatEgneSaker != null) {
    params.set("utelatEgneSaker", String(args.utelatEgneSaker));
  }
  if (args.utenAnsvarlig != null) params.set("utenAnsvarlig", String(args.utenAnsvarlig));
  if (args.utenStatus != null) params.set("utenStatus", String(args.utenStatus));
  for (const v of args.steg ?? []) params.append("steg", v);
  for (const v of args.kategori ?? []) params.append("kategori", v);
  for (const v of args.misbruktype ?? []) params.append("misbruktype", v);
  for (const v of args.ytelseType ?? []) params.append("ytelseType", v);
  for (const v of args.merking ?? []) params.append("merking", v);
  for (const v of args.status ?? []) params.append("status", v);
  for (const v of args.statusSteg ?? []) params.append("statusSteg", v);
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
    kastHvisUtlogget(response);
    if (response.status === 503) {
      logger.warn("Watson Admin API kunne ikke hente kontrollsaker", {
        status: response.status,
      });
      throw new BackendUtilgjengeligError();
    }
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

  if (!BACKEND_API_URL) throw new Error("Mangler backend-url for henting av ufordelte saker.");
  const token = await getBackendOboToken(request);
  const søk = new URL(request.url).searchParams;
  const side = søk.get("side") ?? "1";
  if (!/^\d+$/.test(side) || !Number.isSafeInteger(Number(side)) || Number(side) < 1) {
    throw data("Ugyldig sidenummer", { status: 400 });
  }
  const params = new URLSearchParams({ page: side, size: String(ANTALL_PER_SIDE) });
  const omfang = søk.get("omfang");
  if (omfang !== null) params.set("omfang", omfang);
  for (const [urlNavn, apiNavn] of [
    ["kategori", "kategori"],
    ["misbrukstype", "misbruktype"],
    ["merking", "merking"],
    ["steg", "steg"],
  ]) {
    for (const verdi of søk.getAll(urlNavn)) params.append(apiNavn, verdi);
  }
  const felt: Record<string, string> = {
    saksid: "id",
    kategori: "kategori",
    misbrukstype: "misbruktype",
    steg: "steg",
    status: "status",
    opprettet: "opprettet",
    oppdatert: "oppdatert",
  };
  const kolonne = søk.get("sorter") ?? "opprettet";
  const retning = søk.get("retning") ?? "synkende";
  if (!Object.hasOwn(felt, kolonne) || !["stigende", "synkende"].includes(retning)) {
    throw data("Ugyldig sortering", { status: 400 });
  }
  params.set("sortering", `${felt[kolonne]},${retning === "stigende" ? "ASC" : "DESC"}`);
  const response = await fetch(`${BACKEND_API_URL}/api/v1/kontrollsaker/ufordelte?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!response.ok) {
    kastHvisUtlogget(response);
    logger.warn("Kunne ikke hente ufordelte saker", { status: response.status });
    if (response.status === 503) throw new BackendUtilgjengeligError();
    if (response.status === 400 || response.status === 403) {
      throw data(
        response.status === 403
          ? "Du har ikke tilgang til valgt omfang."
          : "Ugyldig søk etter ufordelte saker.",
        { status: response.status },
      );
    }
    throw new Error("Kunne ikke hente ufordelte saker.");
  }
  const parsed = ufordelteSakerResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    logger.error("Ugyldig responsformat for ufordelte saker");
    throw new Error("Ugyldig svar fra watson-admin-api (ufordelte saker)");
  }
  return parsed.data;
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

  const response = await fetch(
    `${BACKEND_API_URL}${sti`/api/v1/kontrollsaker/${sakId}/saksbehandler`}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ aksjon: "TILDEL", navIdent: saksbehandler }),
    },
  );

  if (!response.ok) {
    kastHvisUtlogget(response);
    logger.error("Kunne ikke tildele kontrollsak i Watson Admin API", {
      status: response.status,
      sakId,
    });
    throw new Error("Kunne ikke tildele kontrollsak.");
  }
}
