import { data, type ActionFunctionArgs } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { BACKEND_API_URL, skalBrukeMockdata } from "~/config/env.server";

export async function action({ request, params }: ActionFunctionArgs) {
  const { sakId, docId } = params;
  if (!sakId || !docId) throw data("Mangler sak eller dokument", { status: 400 });
  if (request.method !== "POST") throw data("Metoden støttes ikke", { status: 405 });
  if (skalBrukeMockdata) {
    throw data("PDF-forhåndsvisning er ikke tilgjengelig i mockmodus", { status: 501 });
  }
  if (!BACKEND_API_URL) throw new Error("Mangler backend-URL for PDF-forhåndsvisning");

  const token = await getBackendOboToken(request);
  const respons = await fetch(
    `${BACKEND_API_URL}/api/v1/kontrollsaker/${sakId}/dokumenter/${docId}/forhandsvisning`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/pdf",
      },
    },
  );
  if (!respons.ok)
    throw data("Kunne ikke generere PDF-forhåndsvisning", { status: respons.status });

  return new Response(respons.body, {
    status: respons.status,
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "no-store",
    },
  });
}
