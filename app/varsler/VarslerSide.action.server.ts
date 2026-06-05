import { data, type ActionFunctionArgs } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { skalBrukeMockdata } from "~/config/env.server";
import { markerVarselSomLest as markerSomLestApi } from "~/varsler/api.server";
import { markerVarselSomLest as markerSomLestMock } from "~/varsler/mock-data.server";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const handling = formData.get("handling");

  if (handling !== "marker_alle_som_lest") {
    throw data("Ukjent handling", { status: 400 });
  }

  const varselIder = formData
    .getAll("varselId")
    .filter((id): id is string => typeof id === "string" && id.trim().length > 0);

  if (skalBrukeMockdata) {
    for (const id of varselIder) {
      markerSomLestMock(request, id);
    }
  } else {
    const token = await getBackendOboToken(request);
    // TODO: Erstatt med batch-endepunkt når backend støtter det
    await Promise.all(varselIder.map((id) => markerSomLestApi(token, id)));
  }

  return { ok: true };
}
