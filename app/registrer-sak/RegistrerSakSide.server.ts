import { redirect } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
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
    misbruktype: skjema.misbruktype,
    merking: skjema.merking[0],
    ytelser: skjema.ytelser.map((rad) => ({
      type: rad.type ?? "",
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

function parseYtelseRader(formData: FormData) {
  const indekser = new Set<number>();
  for (const nøkkel of formData.keys()) {
    const treff = nøkkel.match(/^ytelser\[(\d+)\]\.(?:type|fraDato|tilDato|beløp)$/);
    if (treff) {
      indekser.add(Number(treff[1]));
    }
  }

  return Array.from(indekser)
    .sort((a, b) => a - b)
    .map((i) => ({
      type: (formData.get(`ytelser[${i}].type`) as string | null) || undefined,
      fraDato: (formData.get(`ytelser[${i}].fraDato`) as string | null) || undefined,
      tilDato: (formData.get(`ytelser[${i}].tilDato`) as string | null) || undefined,
      beløp: (formData.get(`ytelser[${i}].beløp`) as string | null) || undefined,
    }));
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();

  const rådata = {
    personIdent: formData.get("personIdent"),
    kategori: formData.get("kategori"),
    kilde: formData.get("kilde"),
    misbruktype: formData.getAll("misbruktype").filter((v) => typeof v === "string" && v !== ""),
    merking: formData.getAll("merking").filter((v) => typeof v === "string" && v !== ""),
    enhet: formData.get("enhet") || undefined,
    organisasjonsnummer: formData.get("organisasjonsnummer") || undefined,
    ytelser: parseYtelseRader(formData),
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
    token: skalBrukeMockdata ? "demo" : await getBackendOboToken(request),
    payload: byggOpprettKontrollsakPayload({
      skjema: data,
      personNavn,
    }),
  });

  return redirect(RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(opprettetSak.id)));
}
