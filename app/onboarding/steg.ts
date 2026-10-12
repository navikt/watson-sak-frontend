import { RouteConfig } from "~/routeConfig";

export type OnboardingSteg = {
  id: string;
  tittel: string;
  tekst: string;
  mål?: string;
};

export const ONBOARDING_STEG: OnboardingSteg[] = [
  {
    id: "velkomst",
    tittel: "Velkommen til Watson\u00A0Sak",
    tekst:
      "Her oppretter, fordeler og følger du opp kontrollsaker i Nav\u00A0kontroll – samlet på ett sted.",
  },
  {
    id: "meny",
    tittel: "Menyen er utgangspunktet ditt",
    tekst:
      "Bruk menyen til venstre for å bytte mellom sidene i Watson Sak. Du kan skjule den med knappen nederst om du vil ha mer plass.",
    mål: "#sidebar-nav",
  },
  {
    id: "oversikt",
    tittel: "Oversikt",
    tekst:
      "Startsiden din. Her ser du nye varsler og det viktigste som har skjedd siden sist. Gå hit når du starter dagen.",
    mål: `#sidebar-nav a[href="${RouteConfig.INDEX}"]`,
  },
  {
    id: "mine-saker",
    tittel: "Mine saker",
    tekst: "Sakene som er tildelt deg. Gå hit for å jobbe videre med sakene du har ansvar for.",
    mål: `#sidebar-nav a[href="${RouteConfig.MINE_SAKER}"]`,
  },
  {
    id: "fordeling",
    tittel: "Ufordelte saker",
    tekst:
      "Saker som venter på en saksbehandler. Gå hit når du skal fordele saker eller plukke en ny sak.",
    mål: `#sidebar-nav a[href="${RouteConfig.FORDELING}"]`,
  },
  {
    id: "alle-saker",
    tittel: "Alle saker",
    tekst:
      "Alle kontrollsaker, med filter på status og alder. Gå hit når du leter etter en bestemt sak eller vil ha oversikt.",
    mål: `#sidebar-nav a[href="${RouteConfig.ALLE_SAKER}"]`,
  },
  {
    id: "opprett-sak",
    tittel: "Opprett sak",
    tekst:
      "Registrer en ny kontrollsak. Gå hit når du har mottatt et tips eller skal starte en ny undersøkelse.",
    mål: `#sidebar-nav a[href="${RouteConfig.REGISTRER_SAK}"]`,
  },
  {
    id: "statistikk",
    tittel: "Statistikk",
    tekst: "Tall og trender for sakene. Gå hit når du vil se hvordan det går over tid.",
    mål: `#sidebar-nav a[href="${RouteConfig.STATISTIKK}"]`,
  },
  {
    id: "migrering",
    tittel: "Migrering",
    tekst:
      "Flytt saker fra det gamle systemet inn i Watson Sak. Gå hit når du skal migrere saker du har ansvar for.",
    mål: `#sidebar-nav a[href="${RouteConfig.MIGRERING}"]`,
  },
  {
    id: "søk",
    tittel: "Søk",
    tekst:
      "Leter du etter en bestemt sak? Bruk søkefeltet øverst. Det er ofte raskeste vei til saken du skal jobbe med.",
    mål: "[data-hurtigsøk-skjema]",
  },
  {
    id: "varsler",
    tittel: "Varsler",
    tekst:
      "Her får du beskjed når noe skjer i sakene dine. Et tall på bjella betyr at du har uleste varsler.",
    mål: '[aria-label^="Varsler,"]',
  },
  {
    id: "lykke-til",
    tittel: "Lykke til!",
    tekst:
      "Det var alt. Har du funnet en feil eller har en idé til forbedring? Meld det i Idéportalen – vi leser alt.",
  },
];

export const IDÉPORTAL_URL = "https://watsonsak.ideas.aha.io";
