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

function byggYtelser(ytelser: OpprettSakSkjema["ytelser"], fraDato: string, tilDato: string) {
  return ytelser.map((ytelse) => ({
    type: ytelse,
    periodeFra: fraDato,
    periodeTil: tilDato,
  }));
}

export function byggOpprettKontrollsakPayload({
  skjema,
  navIdent,
  mottakEnhet,
  personNavn,
  saksbehandlerNavn,
}: {
  skjema: OpprettSakSkjema;
  navIdent: string;
  mottakEnhet: string;
  personNavn: string;
  saksbehandlerNavn: string;
}): OpprettKontrollsakRequest {
  return {
    personIdent: skjema.personIdent,
    personNavn,
    saksbehandlere: {
      eier: {
        navIdent,
        navn: saksbehandlerNavn,
        enhet: mottakEnhet,
      },
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

  const innloggetBruker = await hentInnloggetBruker({ request });
  const data = resultat.data;
  const personNavn = formData.get("personNavn");

  if (typeof personNavn !== "string" || personNavn.trim() === "") {
    return { feil: { personIdent: ["Mangler navn på personen som saken opprettes for"] } };
  }

  const mottakEnhet = hentMottakEnhet(innloggetBruker.organisasjoner);

  await opprettKontrollsak({
    token: innloggetBruker.token,
    payload: byggOpprettKontrollsakPayload({
      skjema: data,
      navIdent: innloggetBruker.navIdent,
      mottakEnhet,
      personNavn,
      saksbehandlerNavn: innloggetBruker.name,
    }),
  });

  return redirect(RouteConfig.INDEX);
}
