import { parseWithZod } from "@conform-to/zod/v4";
import { data, redirect } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { skalBrukeMockdata } from "~/config/env.server";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import { erFnr } from "~/utils/string-utils";
import type { OpprettKontrollsakRequest } from "./api.server";
import type { Route } from "./+types/RegistrerSakSide.route";
import { opprettKontrollsak } from "./api.server";
import { pendingFnrCookie } from "./pending-fnr.server";
import { enhetAlternativer, opprettSakSchema, type OpprettSakSkjema } from "./validering";

type OpprettSakSaksbehandler = NonNullable<OpprettKontrollsakRequest["saksbehandlere"]>["eier"];

export function byggOpprettKontrollsakPayload({
  skjema,
  eier = null,
}: {
  skjema: OpprettSakSkjema;
  eier?: OpprettSakSaksbehandler;
}): OpprettKontrollsakRequest {
  return {
    personIdent: skjema.personIdent,
    saksbehandlere: {
      eier,
      deltMed: [],
    },
    kategori: skjema.kategori,
    kilde: skjema.kilde,
    prioritet: "NORMAL",
    misbruktype: skjema.misbruktype,
    merking: skjema.merking,
    arbeidsgivere: skjema.arbeidsgivere ?? [],
    ytelser: skjema.ytelser
      .filter((rad) => rad.type !== undefined)
      .map((rad) => ({
        type: rad.type as string,
        periodeFra: rad.fraDato ?? "",
        periodeTil: rad.tilDato ?? "",
        belop: rad.beløp,
      })),
  };
}

export async function loader({ request }: Route.LoaderArgs) {
  const cookieHeader = request.headers.get("Cookie");
  const pendingFnr = await pendingFnrCookie.parse(cookieHeader);
  const fnr = pendingFnr && erFnr(pendingFnr) ? pendingFnr : null;

  const headers = new Headers();
  if (fnr) {
    headers.set("Set-Cookie", await pendingFnrCookie.serialize("", { maxAge: 0 }));
  }

  return data({ enheter: enhetAlternativer, fnr }, { headers });
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema: opprettSakSchema });

  if (submission.status !== "success") {
    return submission.reply();
  }

  const data = submission.value;
  const token = skalBrukeMockdata ? "demo" : await getBackendOboToken(request);

  const opprettetSak = await opprettKontrollsak({
    request,
    token,
    payload: byggOpprettKontrollsakPayload({ skjema: data }),
  });

  return redirect(RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(opprettetSak.id)));
}
