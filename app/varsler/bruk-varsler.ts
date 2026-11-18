import { useFetcher, useRouteLoaderData } from "react-router";
import { RouteConfig } from "~/routeConfig";
import type { loader } from "~/layout/AppLayout";
import type { Varsel } from "./typer";

export const VARSLER_FETCHER_KEY = "varsler-polling";

/**
 * Returnerer uleste varsler. Leser fra polling-fetcher (ferskest)
 * med fallback til layout-loader (SSR-data).
 */
export function useVarsler(): Varsel[] {
  return useUlesteVarsler().varsler;
}

/**
 * Totalt antall uleste varsler. Kan være høyere enn `useVarsler().length`,
 * siden bare første side med varsler hentes.
 */
export function useAntallUleste(): number {
  return useUlesteVarsler().antallUleste;
}

type UlesteVarslerData = { varsler: Varsel[]; antallUleste: number };

function useUlesteVarsler(): UlesteVarslerData {
  const initialData = useRouteLoaderData<typeof loader>("layout/AppLayout");
  const fetcher = useFetcher<UlesteVarslerData>({ key: VARSLER_FETCHER_KEY });
  return fetcher.data ?? initialData ?? { varsler: [], antallUleste: 0 };
}

/** Trigger en umiddelbar refresh av varsler-data. */
export function useRefreshVarsler() {
  const fetcher = useFetcher<UlesteVarslerData>({ key: VARSLER_FETCHER_KEY });
  return () => fetcher.load(RouteConfig.API.VARSLER_ULESTE);
}
