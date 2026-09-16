import { redirectDocument } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { skalBrukeMockdata } from "~/config/env.server";
import { logger } from "~/logging/logging";
import { getSaksreferanse } from "~/saker/id";
import * as backendApi from "~/saker/api.server";
import { getSaksenhet } from "~/saker/selectors";
import { getStatus } from "~/saker/visning";
import { hentValgfriTekst } from "~/utils/form-data";
import { erFnr, formaterFødselsnummer } from "~/utils/string-utils";
import { RouteConfig } from "~/routeConfig";
import { INGEN_TILGANG_TIL_Å_OPPRETTE_SAK_MELDING } from "./feilmeldinger";
import { pendingFnrCookie } from "./pending-fnr.server";
import { slaOppPerson } from "./person-oppslag.mock.server";

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const fnr = (hentValgfriTekst(formData, "fnr") ?? "").replace(/\s/g, "");

  // Dette endepunktet er bygget for å kalles via `personFetcher.Form`
  // (React Router sin klient-side interception), ikke som en vanlig
  // sideinnsending. Enkelte nettlesere (bl.a. observert i eldre macOS
  // Safari, trolig knyttet til autofyll/"recent searches" på
  // <input type="search">) kan av og til gjøre en ekte, native
  // skjemainnsending i stedet for å la React fange opp submit-eventet.
  // Da ender brukeren opp på denne URL-en direkte, og ville uten denne
  // sjekken se det rå JSON-svaret i stedet for opprett-sak-siden.
  //
  // Ekte sidenavigasjoner sender `Accept: text/html...`, mens
  // React Router sin interne `fetch()` bruker standard `Accept: */*`.
  // Vi bruker dette til å skille de to, og faller tilbake til en
  // redirect til opprett-sak-siden (med fnr forhåndsutfylt via samme
  // cookie som `forhåndsutfyll.api.ts` bruker) i stedet for å returnere
  // JSON direkte til nettleseren.
  const erSidenavigasjon = request.headers.get("Accept")?.includes("text/html") ?? false;
  if (erSidenavigasjon) {
    if (!erFnr(fnr)) {
      return redirectDocument(RouteConfig.REGISTRER_SAK);
    }
    return redirectDocument(RouteConfig.REGISTRER_SAK, {
      headers: { "Set-Cookie": await pendingFnrCookie.serialize(fnr) },
    });
  }

  if (!fnr || !/^\d{11}$/.test(fnr)) {
    return Response.json({ feil: "Ugyldig fødselsnummer" }, { status: 400 });
  }

  if (skalBrukeMockdata) {
    const resultat = slaOppPerson(request, fnr);
    if (!resultat) {
      return Response.json({ person: null, eksisterendeSaker: [] });
    }
    return Response.json(resultat);
  }

  const token = await getBackendOboToken(request);

  const resultat = await backendApi.slåOppPerson(token, fnr);

  switch (resultat.type) {
    case "success": {
      let eksisterendeSaker: Array<{
        sakId: string;
        opprettetDato: string;
        personNavn: string;
        saksbehandler: string;
        enhet: string;
        status: string;
      }> = [];

      try {
        // Henter kun første side (maks 100 saker) — brukes til en enkel oversikt over
        // eksisterende saker, ikke en fullstendig paginert visning. Bruker gjeldende
        // ident (ikke søkestrengen `fnr`) slik at søket også finner saker registrert
        // under gjeldende ident selv om det ble søkt med en historisk ident.
        const { items: saker } = await backendApi.søkKontrollsaker(
          token,
          resultat.person.personIdent,
          1,
          100,
        );
        eksisterendeSaker = saker.map((sak) => ({
          sakId: getSaksreferanse(sak.id),
          opprettetDato: sak.opprettet.slice(0, 10),
          personNavn: sak.personNavn ?? resultat.person.navn,
          saksbehandler: sak.saksbehandlere.eier?.navn ?? sak.saksbehandlere.opprettetAv.navn,
          enhet: getSaksenhet(sak) || "Ukjent",
          status: getStatus(sak),
        }));
      } catch (error) {
        logger.warn("Kunne ikke hente eksisterende saker for person", { error });
      }

      return Response.json({
        person: {
          navn: resultat.person.navn,
          personnummer: formaterFødselsnummer(resultat.person.personIdent),
          aktørId: "",
          alder: resultat.person.alder,
          adresseskjermet: resultat.person.adresseskjermet,
          kanOppretteSak: resultat.person.kanOppretteSak,
        },
        eksisterendeSaker,
        // Backend løser alltid opp historiske identer til gjeldende ident (personIdent i
        // responsen) — avviker den fra søket, ble det søkt med en historisk ident.
        søktMedHistoriskIdent: resultat.person.personIdent !== fnr,
      });
    }

    case "ikke-funnet":
      return Response.json({ person: null, eksisterendeSaker: [] });

    case "ingen-tilgang":
      return Response.json({ feil: INGEN_TILGANG_TIL_Å_OPPRETTE_SAK_MELDING }, { status: 403 });

    case "feil":
      return Response.json({ feil: resultat.melding }, { status: 502 });
  }
}
