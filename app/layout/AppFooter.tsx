import { BooksIcon, LightBulbIcon, PersonIcon } from "@navikt/aksel-icons";
import { Detail, Link as NavLink, Theme } from "@navikt/ds-react";
import { Link, unstable_useRoute } from "react-router";
import { RouteConfig } from "~/routeConfig";

export function AppFooter() {
  const loaderData = unstable_useRoute("root");
  const appversjon = formaterVersjon(loaderData?.loaderData?.envs.appversjon);
  return (
    <div className="mt-8">
      <Theme hasBackground theme="dark">
        <footer className="p-4">
          <ul className="flex items-center justify-center gap-4 list-none mx-auto my-0">
            <li className="flex items-center gap-2">
              <BooksIcon aria-hidden="true" />
              <NavLink
                href="https://navno.sharepoint.com/sites/45/SitePages/Holmes.aspx"
                target="_blank"
                rel="noopener noreferrer"
              >
                Hjelp
              </NavLink>
            </li>
            <li className="flex items-center gap-2">
              <LightBulbIcon aria-hidden="true" />
              <NavLink
                href="https://watson-sak.ideas.aha.io"
                target="_blank"
                rel="noopener noreferrer"
              >
                Idéportal
              </NavLink>
            </li>
            <li className="flex items-center gap-2">
              <PersonIcon aria-hidden="true" />
              <NavLink as={Link} to={RouteConfig.PERSONVERN}>
                Personvern
              </NavLink>
            </li>
          </ul>
          <Detail align="center" className="mt-2 text-ax-text-neutral-subtle">
            Versjon: {appversjon}
          </Detail>
        </footer>
      </Theme>
    </div>
  );
}

function formaterVersjon(versjon?: string) {
  if (!versjon) {
    return "ukjent";
  }
  const erHash = /^[0-9a-f]{7,}/i.test(versjon);
  if (erHash) {
    return versjon.slice(0, 7);
  }
  return versjon;
}
