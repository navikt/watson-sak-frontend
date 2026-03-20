import { BooksIcon, LightBulbIcon, MenuGridIcon, PersonIcon } from "@navikt/aksel-icons";
import { ActionMenu, InternalHeader, Search, Spacer, Tag } from "@navikt/ds-react";
import { useEffect, useRef } from "react";
import { Form, Link } from "react-router";
import { useInnloggetBruker } from "~/auth/innlogget-bruker";
import { useMiljø } from "~/miljø/useMiljø";
import { RouteConfig } from "~/routeConfig";

export function AppHeader() {
  const innloggetBruker = useInnloggetBruker();
  const skjemaRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && event.metaKey) {
        event.preventDefault();
        skjemaRef.current?.querySelector("input")?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const miljø = useMiljø();
  const visMiljøtag = miljø !== "prod";
  const miljøtagVariant = miljø === "demo" ? "alt2" : miljø === "dev" ? "alt1" : "alt3";

  return (
    <InternalHeader>
      <InternalHeader.Title as="h1">
        <div className="flex items-center gap-2">
          <Link to={RouteConfig.INDEX}>Watson Sak</Link>
          {visMiljøtag && (
            <Tag variant={miljøtagVariant} size="small">
              {miljø}
            </Tag>
          )}
        </div>
      </InternalHeader.Title>

      <Spacer />
      <Form
        method="post"
        action={RouteConfig.SØK}
        role="search"
        aria-label="Hurtigsøk"
        className="flex items-center self-stretch"
        ref={skjemaRef}
      >
        <Search
          label="Søk i saker"
          name="søketekst"
          variant="secondary"
          size="small"
          htmlSize={24}
          aria-keyshortcuts="Meta+K"
        />
      </Form>
      <Spacer />
      <ActionMenu>
        <ActionMenu.Trigger>
          <InternalHeader.Button>
            <MenuGridIcon fontSize="1.5rem" title="Systemer og oppslagsverk" />
          </InternalHeader.Button>
        </ActionMenu.Trigger>

        <ActionMenu.Content>
          <ActionMenu.Group label="Interne flater">
            <ActionMenu.Item as="a" href="https://watson-sok.intern.nav.no" icon={<PersonIcon />}>
              Watson Søk
            </ActionMenu.Item>
            <ActionMenu.Item as="a" href="https://watson-sak.intern.nav.no" icon={<PersonIcon />}>
              Watson Sak
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
            href="https://watson-sak.ideas.aha.io"
            target="_blank"
            rel="noopener noreferrer"
            icon={<LightBulbIcon />}
          >
            Idéportal
          </ActionMenu.Item>
        </ActionMenu.Content>
      </ActionMenu>

      <InternalHeader.User name={innloggetBruker?.name ?? "Saksbehandler"} />
    </InternalHeader>
  );
}
