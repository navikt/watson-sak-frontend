import { redirect } from "react-router";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { mockYtelser } from "~/fordeling/mock-data.server";
import { RouteConfig } from "~/routeConfig";
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

function byggYtelser(
  ytelser: OpprettSakSkjema["ytelser"],
  fraDato: string,
  tilDato: string,
  belop?: number,
) {
  return ytelser.map((ytelse) => ({
    type: ytelse,
    periodeFra: fraDato,
    periodeTil: tilDato,
    belop,
  }));
}

export function byggOpprettKontrollsakPayload({
  skjema,
  navIdent,
  navn,
}: {
  skjema: OpprettSakSkjema;
  navIdent: string;
  navn: string;
}): OpprettKontrollsakRequest {
  return {
    personIdent: skjema.personIdent,
    saksbehandlere: {
      eier: {
        navIdent,
        navn,
      },
      deltMed: [],
    },
    kategori: skjema.kategori,
    prioritet: "NORMAL",
    misbruktype: skjema.misbruktype ? [skjema.misbruktype] : [],
    merking: skjema.merking,
    ytelser: byggYtelser(skjema.ytelser, skjema.fraDato, skjema.tilDato, skjema.caBeløp),
    kilde: skjema.kilde,
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

  const innloggetBruker = await hentInnloggetBruker({ request });
  const data = resultat.data;

  await opprettKontrollsak({
    token: innloggetBruker.token,
    payload: byggOpprettKontrollsakPayload({
      skjema: data,
      navIdent: innloggetBruker.navIdent,
      navn: innloggetBruker.name,
    }),
  });

  return redirect(RouteConfig.INDEX);
}
