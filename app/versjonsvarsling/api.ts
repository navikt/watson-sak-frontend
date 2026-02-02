import { env } from "~/config/env.server";

/**
 * Returnerer dagens appversjon slik at klienten kan avgjøre om en oppdatering er tilgjengelig.
 */
export async function loader() {
  return Response.json(
    { appversjon: env.APP_VERSION },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
