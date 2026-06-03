import { useRouteLoaderData } from "react-router";
import type { loader } from "~/layout/AppLayout";

export function useVarsler() {
  const data = useRouteLoaderData<typeof loader>("layout/AppLayout");
  return data?.varsler ?? [];
}
