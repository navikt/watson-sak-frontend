import { redirect } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
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

function byggYtelser(ytelser: OpprettSakSkjema["ytelser"], fraDato: string, tilDato: string) {
  return ytelser.map((ytelse) => ({
    type: ytelse,
    periodeFra: fraDato,
    periodeTil: tilDato,
  }));
}

export function byggOpprettKontrollsakPayload({
  skjema,
  personNavn,
}: {
  skjema: OpprettSakSkjema;
  personNavn: string;
}): OpprettKontrollsakRequest {
  return {
    personIdent: skjema.personIdent,
    personNavn,
    saksbehandlere: {
      eier: null,
      deltMed: [],
    },
    kategori: skjema.kategori,
    kilde: skjema.kilde,
    prioritet: "NORMAL",
    misbruktype: skjema.misbruktype ? [skjema.misbruktype] : [],
    merking: skjema.merking,
    ytelser: byggYtelser(skjema.ytelser, skjema.fraDato, skjema.tilDato).map((ytelse) => ({
      ...ytelse,
      belop: skjema.caBeløp,
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

  const rådata = {
    personIdent: formData.get("personIdent"),
    personNavn: formData.get("personNavn"),
    ytelser: formData.getAll("ytelser"),
    fraDato: formData.get("fraDato") || undefined,
    tilDato: formData.get("tilDato") || undefined,
    kategori: formData.get("kategori"),
    misbruktype: formData.get("misbruktype") || undefined,
    merking: formData.get("merking") || undefined,
    kilde: formData.get("kilde"),
    enhet: formData.get("enhet"),
    caBeløp: formData.get("caBeløp") || undefined,
    organisasjonsnummer: formData.get("organisasjonsnummer") || undefined,
  };

  const resultat = opprettSakSchema.safeParse(rådata);

  if (!resultat.success) {
    return { feil: resultat.error.flatten().fieldErrors };
  }

  await hentInnloggetBruker({ request });
  const data = resultat.data;
  const personOppslag = slaOppPerson(data.personIdent);
  const personNavn = personOppslag?.person.navn;

  if (typeof personNavn !== "string" || personNavn.trim() === "") {
    return { feil: { skjema: ["Fant ikke navn på personen som saken opprettes for"] } };
  }

  const opprettetSak = await opprettKontrollsak({
    token: await getBackendOboToken(request),
    payload: byggOpprettKontrollsakPayload({
      skjema: data,
      personNavn,
    }),
  });

  return redirect(RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(opprettetSak.id)));
}
