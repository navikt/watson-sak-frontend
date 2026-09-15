import { isRouteErrorResponse } from "react-router";
import { IkkeInnlogget } from "~/feilhåndtering/IkkeInnlogget";
import { InternalServerError } from "~/feilhåndtering/InternalServerError";
import { PageNotFound } from "~/feilhåndtering/PageNotFound";
import { logger } from "~/logging/logging";
import type { Route } from "../+types/root";
import { HtmlRamme } from "./HtmlRamme";

export function RootErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === 401) {
    // Ikke en uventet feil, men en utlogget bruker — ikke logg som error.
    logger.warn("Bruker møtte 401 fra backend, viser utlogget-side");
    return (
      <HtmlRamme umamiSiteId="">
        <IkkeInnlogget />
      </HtmlRamme>
    );
  }
  logger.error("Feil fanget av error boundary", { error });
  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <HtmlRamme umamiSiteId="">
        <PageNotFound />
      </HtmlRamme>
    );
  }
  return (
    <HtmlRamme umamiSiteId="">
      <InternalServerError />
    </HtmlRamme>
  );
}
