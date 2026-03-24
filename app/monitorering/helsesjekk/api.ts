import { BACKEND_API_URL } from "~/config/env.server";
import { logger } from "~/logging/logging";

type HelsesjekkLoaderArgs = {
  request: Request;
};

export async function loader({ request }: HelsesjekkLoaderArgs) {
  const url = new URL(request.url);
  const skalSjekkeBackend = url.searchParams.get("backend") === "true";

  if (!skalSjekkeBackend) {
    return Response.json(
      { ok: true },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  if (!BACKEND_API_URL) {
    logger.warn("Manglende backend-url for helsesjekk");
    return Response.json(
      {
        ok: false,
        backend: {
          ok: false,
          status: 503,
        },
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  try {
    const response = await fetch(`${BACKEND_API_URL}/api/health`, {
      headers: {
        Accept: "application/json, text/plain",
      },
    });

    if (!response.ok) {
      logger.warn("Watson Admin API sin helsesjekk svarte med feilstatus", {
        status: response.status,
      });
      return Response.json(
        {
          ok: false,
          backend: {
            ok: false,
            status: response.status,
          },
        },
        {
          status: 503,
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    return Response.json(
      {
        ok: true,
        backend: {
          ok: true,
          status: response.status,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    logger.error("Klarte ikke å hente helsesjekk fra Watson Admin API", {
      error,
    });

    return Response.json(
      {
        ok: false,
        backend: {
          ok: false,
          status: 503,
        },
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }
}
