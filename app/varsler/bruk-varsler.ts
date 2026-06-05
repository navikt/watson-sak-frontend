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
  const initialData = useRouteLoaderData<typeof loader>("layout/AppLayout");
  const fetcher = useFetcher<{ varsler: Varsel[] }>({ key: VARSLER_FETCHER_KEY });
  return fetcher.data?.varsler ?? initialData?.varsler ?? [];
}

/** Trigger en umiddelbar refresh av varsler-data. */
export function useRefreshVarsler() {
  const fetcher = useFetcher<{ varsler: Varsel[] }>({ key: VARSLER_FETCHER_KEY });
  return () => fetcher.load(RouteConfig.API.VARSLER_ULESTE);
}
