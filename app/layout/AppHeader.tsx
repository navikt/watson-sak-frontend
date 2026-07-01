import { BooksIcon, LeaveIcon, LightBulbIcon, MenuGridIcon, PersonIcon } from "@navikt/aksel-icons";
import { ActionMenu, InternalHeader, Search, Spacer, Tag } from "@navikt/ds-react";
import { useEffect, useRef } from "react";
import { Form, Link, useLocation } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { useInnloggetBruker } from "~/auth/innlogget-bruker";
import { useMiljø } from "~/miljø/useMiljø";
import { RouteConfig } from "~/routeConfig";
import { SØK_RESULTATLENKE_SELECTOR } from "~/søk/sok-navigasjon";
import { VarselBjelle } from "~/varsler/VarselBjelle";

export function AppHeader() {
  const innloggetBruker = useInnloggetBruker();
  const skjemaRef = useRef<HTMLFormElement>(null);
  const location = useLocation();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && event.metaKey) {
        event.preventDefault();
        sporHendelse("hurtigsøk aktivert");
        skjemaRef.current?.querySelector("input")?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleSøkefeltKeyDown(event: React.KeyboardEvent) {
    // location.pathname er URL-kodet (f.eks. "/s%C3%B8k"), mens RouteConfig.SØK
    // er den rå strengen "/søk" — må dekodes før sammenligning.
    if (event.key !== "ArrowDown" || decodeURIComponent(location.pathname) !== RouteConfig.SØK)
      return;

    const førsteLenke = document.querySelector<HTMLAnchorElement>(SØK_RESULTATLENKE_SELECTOR);
    if (førsteLenke) {
      event.preventDefault();
      førsteLenke.focus();
    }
  }

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
        data-hurtigsøk-skjema
        onSubmit={(event) => {
          const formData = new FormData(event.currentTarget);
          const søketekst = formData.get("søketekst")?.toString().trim();
          if (søketekst) {
            sporHendelse("søk utført", { kilde: "hurtigsøk" });
          }
        }}
      >
        <Search
          label="Søk i saker"
          name="søketekst"
          variant="secondary"
          size="small"
          htmlSize={24}
          aria-keyshortcuts="Meta+K"
          onKeyDown={handleSøkefeltKeyDown}
        />
      </Form>
      <Spacer />
      <VarselBjelle />
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

          <ActionMenu.Divider />
          <ActionMenu.Item as="a" href="/oauth2/logout" icon={<LeaveIcon />}>
            Logg ut
          </ActionMenu.Item>
        </ActionMenu.Content>
      </ActionMenu>

      <InternalHeader.User name={innloggetBruker?.name ?? "Saksbehandler"} />
    </InternalHeader>
  );
}
