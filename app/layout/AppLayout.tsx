import { Page } from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { Outlet } from "react-router";
import type { LoaderFunctionArgs, ShouldRevalidateFunctionArgs } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { skalBrukeMockdata } from "~/config/env.server";
import { logger } from "~/logging/logging";
import { hentUlesteVarsler as hentUlesteVarslerFraApi } from "~/varsler/api.server";
import { hentUlesteVarsler as hentUlesteVarslerFraMock } from "~/varsler/mock-data.server";
import { AppFooter } from "./AppFooter";
import { AppHeader } from "./AppHeader";
import { AppSidebar } from "./AppSidebar";
import { InfoBanner } from "./InfoBanner";

// Ikke revalider layout-loaderen etter fetcher-actions til API-ruter.
// Varsler oppdateres via polling (useRevalidator i VarselBjelle).
export function shouldRevalidate({ formAction, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
  if (formAction?.startsWith("/api/")) {
    return false;
  }
  return defaultShouldRevalidate;
}

export async function loader({ request }: LoaderFunctionArgs) {
  if (skalBrukeMockdata) {
    return { varsler: hentUlesteVarslerFraMock(request) };
  }
  const token = await getBackendOboToken(request);
  try {
    return { varsler: await hentUlesteVarslerFraApi(token) };
  } catch (err) {
    logger.warn("Klarte ikke hente varsler, faller tilbake til tom liste", {
      feil: String(err),
    });
    return { varsler: [] };
  }
}

export default function RootLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <InfoBanner />
      <div className="flex flex-1">
        <AppSidebar />
        <main id="maincontent" className="flex-1 min-w-0">
          <Page>
            <PageBlock width="2xl" gutters className="mx-0!">
              <Outlet />
            </PageBlock>
          </Page>
        </main>
      </div>
      <AppFooter />
    </div>
  );
}
