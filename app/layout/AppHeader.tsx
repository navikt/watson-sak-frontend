import {
  BooksIcon,
  LightBulbIcon,
  MenuGridIcon,
  MoonIcon,
  PersonIcon,
  SunIcon,
} from "@navikt/aksel-icons";
import { ActionMenu, InternalHeader, Spacer, Tag } from "@navikt/ds-react";
import { Link } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { useInnloggetBruker } from "~/auth/innlogget-bruker";
import { useMiljø } from "~/miljø/useMiljø";
import { RouteConfig } from "~/routeConfig";
import { useTheme } from "~/tema/ThemeContext";

export function AppHeader() {
  const innloggetBruker = useInnloggetBruker();
  const { theme, toggleTheme } = useTheme();

  const miljø = useMiljø();
  const visMiljøtag = miljø !== "prod";
  const miljøtagVariant =
    miljø === "demo" ? "alt2" : miljø === "dev" ? "alt1" : "alt3";

  return (
    <InternalHeader>
      <InternalHeader.Title as="h1">
        <div className="flex items-center gap-2">
          <Link to={RouteConfig.INDEX}>Watson Sak Admin</Link>
          {visMiljøtag && (
            <Tag variant={miljøtagVariant} size="small">
              {miljø}
            </Tag>
          )}
        </div>
      </InternalHeader.Title>

      <Spacer />
      <ActionMenu>
        <ActionMenu.Trigger>
          <InternalHeader.Button>
            <MenuGridIcon fontSize="1.5rem" title="Systemer og oppslagsverk" />
          </InternalHeader.Button>
        </ActionMenu.Trigger>

        <ActionMenu.Content>
          <ActionMenu.Group label="Interne flater">
            <ActionMenu.Item
              as="a"
              href="https://watson-sok.intern.nav.no"
              icon={<PersonIcon />}
            >
              Watson Søk
            </ActionMenu.Item>
            <ActionMenu.Item
              as="a"
              href="https://watson-sak-admin.intern.nav.no"
              icon={<PersonIcon />}
            >
              Watson Sak Admin
            </ActionMenu.Item>
          </ActionMenu.Group>

          <ActionMenu.Divider />
          <ActionMenu.Item
            as="a"
            href="https://navno.sharepoint.com/sites/45/SitePages/Holmes.aspx"
            target="_blank"
            rel="noopener noreferrer"
            icon={<BooksIcon />}
          >
            Hjelp
          </ActionMenu.Item>
          <ActionMenu.Item
            as="a"
            href="https://watson-sak-admin.ideas.aha.io"
            target="_blank"
            rel="noopener noreferrer"
            icon={<LightBulbIcon />}
          >
            Idéportal
          </ActionMenu.Item>

          <ActionMenu.Item
            onSelect={() => {
              toggleTheme();
              sporHendelse("endre tema", {
                tema: theme === "light" ? "mørk" : "lys",
              });
            }}
            icon={theme === "light" ? <MoonIcon /> : <SunIcon />}
          >
            Bruk {theme === "light" ? "mørke" : "lyse"} farger
          </ActionMenu.Item>
        </ActionMenu.Content>
      </ActionMenu>

      <InternalHeader.User name={innloggetBruker?.name ?? "Saksbehandler"} />
    </InternalHeader>
  );
}
