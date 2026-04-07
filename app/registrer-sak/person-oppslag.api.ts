import { slaOppPerson } from "./person-oppslag.mock.server";
import { skalBrukeMockdata } from "~/config/env.server";

export function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const fnr = (url.searchParams.get("fnr") ?? "").replace(/\s/g, "");

  if (!fnr || !/^\d{11}$/.test(fnr)) {
    return Response.json({ feil: "Ugyldig fødselsnummer" }, { status: 400 });
  }

  if (!skalBrukeMockdata) {
    return Response.json(
      { feil: "Personoppslag mot backend er ikke implementert ennå" },
      { status: 501 },
    );
  }

  const resultat = slaOppPerson(fnr);

  if (!resultat) {
    return Response.json({ person: null, eksisterendeSaker: [] });
  }

  return Response.json(resultat);
}
