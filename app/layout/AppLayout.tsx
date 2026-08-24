import { PageBlock } from "@navikt/ds-react/Page";
import { Outlet, useMatches } from "react-router";
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

// Ikke revalider layout-loaderen etter fetcher-actions til varsel-API-ruter.
// Varsler oppdateres via polling (useFetcher + setInterval i VarselBjelle).
export function shouldRevalidate({
  formAction,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  if (formAction?.startsWith("/api/varsler")) {
    return false;
  }
  return defaultShouldRevalidate;
}

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    if (skalBrukeMockdata) {
      return { varsler: hentUlesteVarslerFraMock(request) };
    }
    const token = await getBackendOboToken(request);
    return { varsler: await hentUlesteVarslerFraApi(token) };
  } catch (err) {
    logger.warn("Klarte ikke hente varsler, faller tilbake til tom liste", {
      feil: String(err),
    });
    return { varsler: [] };
  }
}

/** Ruter kan sette dette som `handle` for å be layouten om å slippe bredde-begrensningen
 * og/eller skjule footeren, f.eks. for arbeidsflater som dokumenteditoren.
 * `bredPageBlock` fjerner kun maks-bredden (beholder gutters) — brukes av
 * listevisninger med brede tabeller som ellers får unødvendig horisontal scroll. */
type Rutehandle =
  | { fullbredde?: boolean; skjulFooter?: boolean; bredPageBlock?: boolean }
  | undefined;

export default function RootLayout() {
  // Ruter kan be om å slippe bredde-begrensningen via `handle`, f.eks. dokumenteditoren
  // som skal bruke hele flaten. De styrer da sine egne marger selv.
  const matches = useMatches();
  const fullbredde = matches.some((match) => (match.handle as Rutehandle)?.fullbredde);
  const skjulFooter = matches.some((match) => (match.handle as Rutehandle)?.skjulFooter);
  const bredPageBlock = matches.some((match) => (match.handle as Rutehandle)?.bredPageBlock);

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <InfoBanner />
      <div className="flex flex-1">
        <AppSidebar />
        <main id="maincontent" className="min-w-0 flex-1">
          {fullbredde ? (
            <Outlet />
          ) : (
            <PageBlock width={bredPageBlock ? undefined : "2xl"} gutters className="mx-0!">
              <Outlet />
            </PageBlock>
          )}
        </main>
      </div>
      {!skjulFooter && <AppFooter />}
    </div>
  );
}
