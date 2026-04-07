import { slaOppPerson } from "./person-oppslag.mock.server";

export function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const fnr = url.searchParams.get("fnr") ?? "";

  if (!fnr || !/^\d{11}$/.test(fnr)) {
    return Response.json({ feil: "Ugyldig fødselsnummer" }, { status: 400 });
  }

  const resultat = slaOppPerson(fnr);

  if (!resultat) {
    return Response.json({ person: null, eksisterendeSaker: [] });
  }

  return Response.json(resultat);
}
