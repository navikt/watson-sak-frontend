import { redirect } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { skalBrukeMockdata } from "~/config/env.server";
import { mockYtelser } from "~/fordeling/mock-data.server";
import { RouteConfig } from "~/routeConfig";
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
    merking: skjema.merking[0],
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

import {
  bygFeilkartFraIssues,
  lesStringliste,
  parseYtelseRader,
  type YtelseRadVerdier,
} from "./skjema-helpers";

export type SkjemaVerdier = {
  personIdent: string;
  kategori: string;
  kilde: string;
  misbruktype: string[];
  merking: string[];
  enhet: string;
  organisasjonsnummer: string;
  ytelser: YtelseRadVerdier[];
};

function lesString(formData: FormData, navn: string): string {
  const verdi = formData.get(navn);
  return typeof verdi === "string" ? verdi : "";
}

function plukkVerdier(formData: FormData): SkjemaVerdier {
  return {
    personIdent: lesString(formData, "personIdent"),
    kategori: lesString(formData, "kategori"),
    kilde: lesString(formData, "kilde"),
    misbruktype: lesStringliste(formData, "misbruktype"),
    merking: lesStringliste(formData, "merking"),
    enhet: lesString(formData, "enhet"),
    organisasjonsnummer: lesString(formData, "organisasjonsnummer"),
    ytelser: parseYtelseRader(formData),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const verdier = plukkVerdier(formData);

  const rådata = {
    personIdent: verdier.personIdent,
    kategori: verdier.kategori,
    kilde: verdier.kilde,
    misbruktype: verdier.misbruktype,
    merking: verdier.merking,
    enhet: verdier.enhet || undefined,
    organisasjonsnummer: verdier.organisasjonsnummer || undefined,
    ytelser: verdier.ytelser,
  };

  const resultat = opprettSakSchema.safeParse(rådata);

  if (!resultat.success) {
    return { feil: bygFeilkartFraIssues(resultat.error.issues), verdier };
  }

  const data = resultat.data;
  const personOppslag = slaOppPerson(request, data.personIdent);
  const personNavn = personOppslag?.person.navn;

  if (typeof personNavn !== "string" || personNavn.trim() === "") {
    return { feil: { skjema: ["Fant ikke navn på personen som saken opprettes for"] }, verdier };
  }

  const opprettetSak = await opprettKontrollsak({
    request,
    token: skalBrukeMockdata ? "demo" : await getBackendOboToken(request),
    payload: byggOpprettKontrollsakPayload({
      skjema: data,
      personNavn,
    }),
  });

  return redirect(RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(opprettetSak.id)));
}
