import { isRouteErrorResponse } from "react-router";
import { InternalServerError } from "~/feilhåndtering/InternalServerError";
import { PageNotFound } from "~/feilhåndtering/PageNotFound";
import { logger } from "~/logging/logging";
import type { Route } from "../+types/root";
import { HtmlRamme } from "./HtmlRamme";

export function RootErrorBoundary({ error }: Route.ErrorBoundaryProps) {
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
