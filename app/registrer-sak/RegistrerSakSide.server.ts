import { parseWithZod } from "@conform-to/zod/v4";
import { redirect } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { skalBrukeMockdata } from "~/config/env.server";
import { mockYtelser } from "~/fordeling/mock-data.server";
import { RouteConfig } from "~/routeConfig";
import * as backendApi from "~/saker/api.server";
import { getSaksreferanse } from "~/saker/id";
import { slaOppPerson } from "./person-oppslag.mock.server";
import type { OpprettKontrollsakRequest } from "./api.server";
import type { Route } from "./+types/RegistrerSakSide.route";
import { opprettKontrollsak } from "./api.server";
import {
  enhetAlternativer,
  kategoriAlternativer,
  kildeAlternativer,
  merkingAlternativer,
  misbrukstypePerKategori,
  opprettSakSchema,
  type OpprettSakSkjema,
} from "./validering";

type OpprettSakSaksbehandler = NonNullable<OpprettKontrollsakRequest["saksbehandlere"]>["eier"];

export function byggOpprettKontrollsakPayload({
  skjema,
  personNavn,
  eier = null,
}: {
  skjema: OpprettSakSkjema;
  personNavn: string;
  eier?: OpprettSakSaksbehandler;
}): OpprettKontrollsakRequest {
  return {
    personIdent: skjema.personIdent,
    personNavn,
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

export function loader() {
  return {
    ytelser: mockYtelser,
    kategorier: kategoriAlternativer,
    misbrukstypePerKategori,
    merkinger: merkingAlternativer,
    enheter: enhetAlternativer,
    kilder: kildeAlternativer,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const submission = parseWithZod(formData, { schema: opprettSakSchema });

  if (submission.status !== "success") {
    return submission.reply();
  }

  const data = submission.value;
  const token = skalBrukeMockdata ? "demo" : await getBackendOboToken(request);

  let personNavn: string | undefined;
  if (skalBrukeMockdata) {
    personNavn = slaOppPerson(request, data.personIdent)?.person.navn;
  } else {
    const resultat = await backendApi.slåOppPerson(token, data.personIdent);
    if (resultat.type === "success") {
      personNavn = resultat.person.navn;
    }
  }

  if (typeof personNavn !== "string" || personNavn.trim() === "") {
    return submission.reply({
      formErrors: ["Fant ikke navn på personen som saken opprettes for"],
    });
  }

  const opprettetSak = await opprettKontrollsak({
    request,
    token,
    payload: byggOpprettKontrollsakPayload({
      skjema: data,
      personNavn,
    }),
  });

  return redirect(RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(opprettetSak.id)));
}
