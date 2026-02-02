import { Outlet, useLoaderData } from "react-router";
import "~/globals.css";
import { useFaro } from "~/monitorering/faro";
import { Versjonsvarsling } from "~/versjonsvarsling/Versjonsvarsling";

import { HtmlRamme } from "./HtmlRamme";
import type { rootLoader } from "./loader.server";

export default function Root() {
  const { envs, initialTheme } = useLoaderData<typeof rootLoader>();
  useFaro();
  return (
    <HtmlRamme initialTheme={initialTheme} umamiSiteId={envs.umamiSiteId}>
      <Versjonsvarsling gjeldendeVersjon={envs.appversjon} />
      <Outlet />
    </HtmlRamme>
  );
}
