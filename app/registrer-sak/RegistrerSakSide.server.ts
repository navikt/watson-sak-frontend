import { redirect } from "react-router";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { mockYtelser } from "~/fordeling/mock-data.server";
import { RouteConfig } from "~/routeConfig";
import type { Route } from "./+types/RegistrerSakSide.route";
import { opprettKontrollsak } from "./api.server";
import {
  kategoriAlternativer,
  kildeAlternativer,
  prioritetAlternativer,
  registrerSakSchema,
  type RegistrerSakSkjema,
} from "./validering";

function hentMottakEnhet(organisasjoner: string) {
  const førsteEnhet = organisasjoner.split(",")[0]?.trim();

  if (!førsteEnhet) {
    throw new Error("Fant ingen mottakende enhet i organisasjoner.");
  }

  if (!/^\d{4}$/.test(førsteEnhet)) {
    throw new Error(
      `Ugyldig mottakende enhet: '${førsteEnhet}'. Forventet enhetsnummer (4 sifre).`,
    );
  }

  return førsteEnhet;
}

function byggYtelser(ytelser: RegistrerSakSkjema["ytelser"], fraDato: string, tilDato: string) {
  return ytelser.map((ytelse) => ({
    type: ytelse,
    periodeFra: fraDato,
    periodeTil: tilDato,
  }));
}

function byggAvsender(data: RegistrerSakSkjema) {
  if (
    !data.avsenderNavn &&
    !data.avsenderTelefon &&
    !data.avsenderAdresse &&
    !data.avsenderAnonym
  ) {
    return null;
  }

  return {
    navn: data.avsenderNavn,
    telefon: data.avsenderTelefon,
    adresse: data.avsenderAdresse,
    anonym: data.avsenderAnonym,
  };
}

export function loader() {
  return {
    ytelser: mockYtelser,
    kategorier: kategoriAlternativer,
    prioriteringer: prioritetAlternativer,
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
    prioritet: formData.get("prioritet"),
    kilde: formData.get("kilde"),
    bakgrunn: formData.get("bakgrunn"),
    avsenderNavn: formData.get("avsenderNavn") || undefined,
    avsenderTelefon: formData.get("avsenderTelefon") || undefined,
    avsenderAdresse: formData.get("avsenderAdresse") || undefined,
    avsenderAnonym: formData.get("avsenderAnonym") === "on",
  };

  const resultat = registrerSakSchema.safeParse(rådata);

  if (!resultat.success) {
    return { feil: resultat.error.flatten().fieldErrors };
  }

  const innloggetBruker = await hentInnloggetBruker({ request });
  const data = resultat.data;

  await opprettKontrollsak({
    token: innloggetBruker.token,
    payload: {
      personIdent: data.personIdent,
      saksbehandler: innloggetBruker.navIdent,
      mottakEnhet: hentMottakEnhet(innloggetBruker.organisasjoner),
      mottakSaksbehandler: innloggetBruker.navIdent,
      kategori: data.kategori,
      prioritet: data.prioritet,
      ytelser: byggYtelser(data.ytelser, data.fraDato, data.tilDato),
      bakgrunn: {
        kilde: data.kilde,
        innhold: data.bakgrunn,
        avsender: byggAvsender(data),
        vedlegg: [],
        tilleggsopplysninger: null,
      },
    },
  });

  return redirect(RouteConfig.INDEX);
}
