import { BooksIcon, LeaveIcon, LightBulbIcon, MenuGridIcon, PersonIcon } from "@navikt/aksel-icons";
import {
  ActionMenu,
  BodyShort,
  ErrorMessage,
  HelpText,
  InternalHeader,
  Spacer,
  Tag,
} from "@navikt/ds-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Form, Link, useLocation } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { IdentifikatorSøkefelt } from "~/formaterte-inputfelt/FormaterteInputfelt";
import { useInnloggetBrukerValgfri } from "~/auth/innlogget-bruker";
import { hentWatsonSakUrl, hentWatsonSokUrl } from "~/config/backend-config";
import { useMiljø } from "~/miljø/useMiljø";
import { RouteConfig } from "~/routeConfig";
import { SØK_RESULTATLENKE_SELECTOR } from "~/søk/sok-navigasjon";
import { useGlitch } from "~/utils/useGlitch";
import { useSherlockCursor } from "~/utils/useSherlockCursor";
import { VarselBjelle } from "~/varsler/VarselBjelle";
import { EndCredits } from "./EndCredits";

// Easter egg: søk på "Moriarty" trigger en kortvarig glitch-effekt før
// søket gjennomføres helt normalt (Moriarty kan tross alt være et reelt
// etternavn, så selve søket skal alltid utføres).
const MORIARTY_EASTER_EGG = "moriarty";

// Easter egg: søk på "Sherlock" bytter musepekeren til en Sherlock-hatt i
// 30 sekunder, eller til brukeren trykker Escape.
const SHERLOCK_EASTER_EGG = "sherlock";

// Easter egg: søk på "end credits" viser en rulletekst over alle som har
// vært med på å lage Watson. Her utføres ikke selve søket.
const END_CREDITS_EASTER_EGG = "end credits";

const HURTIGSØK_FEIL_ID = "hurtigsok-feilmelding";

export function AppHeader() {
  const innloggetBruker = useInnloggetBrukerValgfri();
  const skjemaRef = useRef<HTMLFormElement>(null);
  const location = useLocation();
  const triggerGlitch = useGlitch();
  const triggerSherlockCursor = useSherlockCursor();
  const [visEndCredits, setVisEndCredits] = useState(false);
  const [hurtigsøkUgyldig, setHurtigsøkUgyldig] = useState(false);
  const lukkEndCredits = useCallback(() => setVisEndCredits(false), []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
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
  const watsonSokUrl = hentWatsonSokUrl(miljø);
  const watsonSakUrl = hentWatsonSakUrl(miljø);
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
        className="flex w-[495px] min-w-0 shrink items-center self-stretch"
        ref={skjemaRef}
        data-hurtigsøk-skjema
        onSubmit={(event) => {
          const formData = new FormData(event.currentTarget);
          const søketekst = formData.get("søketekst")?.toString().trim();
          if (!søketekst) {
            event.preventDefault();
            setHurtigsøkUgyldig(true);
            return;
          }
          setHurtigsøkUgyldig(false);
          if (søketekst?.toLowerCase() === END_CREDITS_EASTER_EGG) {
            event.preventDefault();
            setVisEndCredits(true);
            return;
          }
          if (søketekst) {
            sporHendelse("søk utført", { kilde: "hurtigsøk" });
          }
          if (søketekst?.toLowerCase() === MORIARTY_EASTER_EGG) {
            triggerGlitch();
          }
          if (søketekst?.toLowerCase() === SHERLOCK_EASTER_EGG) {
            triggerSherlockCursor();
          }
        }}
      >
        <IdentifikatorSøkefelt
          label="Søk i saker"
          name="søketekst"
          variant="secondary"
          size="small"
          aria-invalid={hurtigsøkUgyldig}
          aria-describedby={hurtigsøkUgyldig ? HURTIGSØK_FEIL_ID : undefined}
          className="w-full [&_input[aria-invalid=true]]:border-ax-border-danger"
          autoComplete="off"
          aria-keyshortcuts="Meta+K Control+K"
          onChange={() => setHurtigsøkUgyldig(false)}
          onKeyDown={handleSøkefeltKeyDown}
        />
      </Form>
      <HelpText title="Hva kan du søke på?" placement="bottom" wrapperClassName="self-center ml-2">
        <BodyShort spacing>Du kan søke på:</BodyShort>
        <ul className="m-0 mb-3 list-disc pl-5">
          <li>Saksnummer</li>
          <li>PID (bare saker opprettet i Watson Sak)</li>
          <li>Fødsels- eller d-nummer (11 siffer)</li>
          <li>Organisasjonsnummer (9 siffer)</li>
        </ul>
        <BodyShort>Mellomrom spiller ingen rolle.</BodyShort>
      </HelpText>
      <div aria-live="polite" className="self-center ml-2">
        {hurtigsøkUgyldig && (
          <ErrorMessage id={HURTIGSØK_FEIL_ID} size="small" showIcon>
            Skriv inn et søk
          </ErrorMessage>
        )}
      </div>
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
            <ActionMenu.Item as="a" href={watsonSokUrl} icon={<PersonIcon />}>
              Watson Søk
            </ActionMenu.Item>
            <ActionMenu.Item as="a" href={watsonSakUrl} icon={<PersonIcon />}>
              Watson Sak
            </ActionMenu.Item>
          </ActionMenu.Group>

          <ActionMenu.Divider />
          <ActionMenu.Item
            as="a"
            href="https://watson-guide.ansatt.nav.no"
            target="_blank"
            rel="noopener noreferrer"
            icon={<BooksIcon />}
          >
            Hjelp
          </ActionMenu.Item>
          <ActionMenu.Item
            as="a"
            href="https://watsonsak.ideas.aha.io"
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
      {visEndCredits && <EndCredits onLukk={lukkEndCredits} />}
    </InternalHeader>
  );
}
