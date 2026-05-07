import { data } from "react-router";
import { hentVarsler, markerVarselSomLest } from "~/varsler/mock-data.server";
import type { Route } from "./+types/LandingSide.route";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const handling = formData.get("handling");
  const varselId = formData.get("varselId");

  if (handling !== "marker_varsel_som_lest") {
    throw data("Ukjent handling", { status: 400 });
  }

  if (typeof varselId !== "string" || !varselId) {
    throw data("Varsel-ID mangler", { status: 400 });
  }

  if (!hentVarsler(request).some((varsel) => varsel.id === varselId)) {
    throw data("Varsel ikke funnet", { status: 404 });
  }

  markerVarselSomLest(request, varselId);

  return { ok: true };
}
