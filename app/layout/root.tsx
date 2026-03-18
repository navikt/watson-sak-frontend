import { Outlet, useLoaderData } from "react-router";
import "~/globals.css";
import { useFaro } from "~/monitorering/faro";
import { Versjonsvarsling } from "~/versjonsvarsling/Versjonsvarsling";

import { HtmlRamme } from "./HtmlRamme";
import type { rootLoader } from "./loader.server";

export default function Root() {
  const { envs, initialPreferences } = useLoaderData<typeof rootLoader>();
  useFaro();
  return (
    <HtmlRamme initialPreferences={initialPreferences} umamiSiteId={envs.umamiSiteId}>
      <Versjonsvarsling gjeldendeVersjon={envs.appversjon} />
      <Outlet />
    </HtmlRamme>
  );
}
