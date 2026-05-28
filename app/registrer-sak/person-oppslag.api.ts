import { getBackendOboToken } from "~/auth/access-token";
import { skalBrukeMockdata } from "~/config/env.server";
import { logger } from "~/logging/logging";
import { getSaksreferanse } from "~/saker/id";
import * as backendApi from "~/saker/api.server";
import { getSaksenhet } from "~/saker/selectors";
import { getStatus } from "~/saker/visning";
import { hentValgfriTekst } from "~/utils/form-data";
import { formaterFødselsnummer } from "~/utils/string-utils";
import { slaOppPerson } from "./person-oppslag.mock.server";

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const fnr = (hentValgfriTekst(formData, "fnr") ?? "").replace(/\s/g, "");

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
        const saker = await backendApi.søkKontrollsaker(token, fnr);
        eksisterendeSaker = saker.map((sak) => ({
          sakId: getSaksreferanse(sak.id),
          opprettetDato: sak.opprettet.slice(0, 10),
          personNavn: sak.kontrollobjekt.navn,
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
        },
        eksisterendeSaker,
      });
    }

    case "ikke-funnet":
      return Response.json({ person: null, eksisterendeSaker: [] });

    case "ingen-tilgang":
      return Response.json(
        { feil: "Du har ikke tilgang til å slå opp denne personen" },
        { status: 403 },
      );

    case "feil":
      return Response.json({ feil: resultat.melding }, { status: 502 });
  }
}
