import { data, type ActionFunctionArgs } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { skalBrukeMockdata } from "~/config/env.server";
import { tekniskFeilSvar } from "~/feilhåndtering/teknisk-feil.server";
import { markerVarselSomLest as markerSomLestApi } from "./api.server";
import { markerVarselSomLest as markerSomLestMock } from "./mock-data.server";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const varselId = formData.get("varselId");

  if (typeof varselId !== "string" || !varselId) {
    return data("Varsel-ID mangler", { status: 400 });
  }

  try {
    if (skalBrukeMockdata) {
      markerSomLestMock(request, varselId);
    } else {
      const token = await getBackendOboToken(request);
      await markerSomLestApi(token, varselId);
    }
  } catch (feil) {
    return tekniskFeilSvar(feil, { kontekst: "markere varsel som lest", request });
  }

  return { ok: true };
}
