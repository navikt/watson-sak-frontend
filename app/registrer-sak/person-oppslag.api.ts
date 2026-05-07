import { slaOppPerson } from "./person-oppslag.mock.server";
import { skalBrukeMockdata } from "~/config/env.server";
import { hentValgfriTekst } from "~/utils/form-data";

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const fnr = (hentValgfriTekst(formData, "fnr") ?? "").replace(/\s/g, "");

  if (!fnr || !/^\d{11}$/.test(fnr)) {
    return Response.json({ feil: "Ugyldig fødselsnummer" }, { status: 400 });
  }

  if (!skalBrukeMockdata) {
    return Response.json(
      { feil: "Personoppslag mot backend er ikke implementert ennå" },
      { status: 501 },
    );
  }

  const resultat = slaOppPerson(request, fnr);

  if (!resultat) {
    return Response.json({ person: null, eksisterendeSaker: [] });
  }

  return Response.json(resultat);
}
