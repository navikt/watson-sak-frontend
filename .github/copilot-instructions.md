# Copilot Instructions

Watson Sak er en React Router v7-applikasjon (framework mode, SSR) for å administrere saker i Watson. Appen kjører på NAIS/GCP og bruker NAVs designsystem Aksel.

## Kommandoer

- `npm run dev` – utviklingsserver (port 5174)
- `npm run dev:local` – utviklingsserver mot lokal backend
- `npm run build` – produksjonsbygg
- `npm run verify` – kjør **alltid** dette før du anser en oppgave som ferdig (tester, lint, format, typecheck, knip)
- `npm run test` – Vitest enhetstester, `npm run test -- app/utils/string-utils.test.ts` for enkeltfil
- `npm run test:e2e` – Playwright e2e-tester, `npx playwright test app/path/to/test.spec.ts` for enkeltfil
- `npm run typecheck` – React Router typegen + tsc
- `npm run lint` / `npm run format` – kodekvalitet (Oxlint og Oxfmt)

Når du kjører `npm run verify`, ikke pipe output til `tail` eller andre kommandoer som kan skjule feil fra parallelle deljobber. Hvis output er for stor, les den lagrede outputfilen og sjekk exit-kode/oppsummering for alle deljobber separat: `test`, `lint`, `format`, `typecheck` og `unused`. Ikke rapporter at verify er grønn før alle deljobber har `exited with code 0`.

## Arkitektur

### Feature-basert struktur

Koden er organisert i feature-mapper under `app/`. Hver feature er en selvstendig modul med egne komponenter, hooks, server-logikk og tester:

```
app/
  admin/             # Interne API-er, f.eks. innlogget bruker
  auth/              # Autentisering (OBO-tokens via @navikt/oasis)
  landingsside/      # Forside med loader/action delt i .server.ts
  fordeling/         # Fordeling av eierløse kontrollsaker
  saker/             # Saksdetaljer, kontrakter, mockdata og saksrelaterte komponenter
  registrer-sak/     # Opprettelse av kontrollsak og personoppslag
  søk/               # Søkeflyt
  preferanser/       # Cookie-baserte brukerpreferanser
  layout/            # Root layout, header, footer, ErrorBoundary og innstillinger
  feature-toggling/  # Unleash feature-flagg og statusmeldinger
  sikkerhet/         # Sikkerhetsheadere, CSP og /.well-known
  tema/              # Lys/mørk/system-tema via preferanser og Aksel Theme
  config/            # Miljøvariabler (Zod-validert)
  monitorering/      # Helsesjekk, Faro-observability
  analytics/         # Umami-sporing
  testing/           # Mock-store og test-API for Playwright
  utils/             # Delte hjelpefunksjoner
```

Legg ny funksjonalitet i en ny feature-mappe. Bruk `utils/` kun for genuint tverrgående hjelpefunksjoner.

Route-filer (`*.route.tsx`) bør primært koble React Router til feature-komponenter og eksportere `loader`/`action`. Når serverlogikken blir mer enn triviell, legg den i en tilhørende `.server.ts`-fil og re-eksporter fra route-filen (se `fordeling/` og `landingsside/`).

### Ruting

Ruter defineres manuelt i `app/routes.ts` med sentraliserte stier i `app/routeConfig.ts`. Bruk alltid `RouteConfig`-konstantene for lenker og rutedefinisjoner.

API-ruter ligger også i `app/routes.ts` og bruker `RouteConfig.API`. Nye API-endepunkter bør være smale React Router `loader`/`action`-moduler som returnerer `data`/`Response`, validerer input eksplisitt og bruker etablerte serverhjelpere.

### Server/klient-separasjon

- Filer med `.server.ts`-suffiks kjøres kun på serveren.
- Loaders henter data server-side (se `app/layout/loader.server.ts` for mønster med `Promise.all` for parallelle kall).
- Root-loaderen gir brukerinfo, feature-flagg, tema og miljøkonfig til hele appen.

### Autentisering

Bruk hjelpere i `app/auth/` – aldri rull egen auth-logikk:

- `getBackendOboToken(request)` – OBO-token for backend-kall
- `hentInnloggetBruker({ request })` – hent brukerinfo server-side
- `useInnloggetBruker()` – hook for brukerinfo i klientkode

### Backend, kontrakter og mockdata

- Backend-URL og mockmodus styres av `app/config/backend-config.ts` og `app/config/env.server.ts`.
- `local-mock`, `demo` og `dev` bruker mockdata (`skalBrukeMockdata`). `local-backend` peker mot `http://localhost:8080`, mens `local-dev`/`dev` bruker `WATSON_ADMIN_API_URL` eller dev-URL.
- Backend-kall skal hente token med `getBackendOboToken(request)`, bruke `BACKEND_API_URL`, sende `Authorization: Bearer ...` og logge med `logger` før de kaster tydelige feil ved `!response.ok`.
- Valider responskontrakter med Zod-skjemaer i feature-nære filer, særlig `app/saker/types.backend.ts`. Bruk `z.infer` for typer i stedet for dupliserte TypeScript-typer der det er praktisk.
- Mockdata som påvirker saksflyt ligger hovedsakelig i `app/saker/*mock*.server.ts` og `app/testing/mock-store/`. Husk å oppdatere reset-logikk når du legger til ny muterbar mocktilstand.

### Preferanser og tema

Bruk `app/preferanser/PreferencesCookie.ts` og `PreferencesContext` for brukerpreferanser. Preferanser lagres i en httpOnly `preferences`-cookie med `sidebarKollapset`, `tema` (`light`/`dark`/`system`) og `visVelkomstmelding`. Ikke lag egne cookies/localStorage for tilsvarende innstillinger.

### Miljøvariabler

Valideres med Zod i `app/config/env.server.ts`. Legg til nye variabler i Zod-skjemaet og `.env.example`.

## Testing

- Vitest-testene ligger ved siden av koden som `.test.ts(x)` og bruker norsk testbeskrivelse.
- Playwright-testene ligger under `app/` som `.spec.ts(x)` og kjører mot dev-server på port 5174 med `playwright.backend.mock.cjs`.
- E2E-tester kan resette mockdata via `RouteConfig.API.RESET_MOCK_DATA` (`/api/reset-mock-data`). Bruk dette når tester muterer felles mock-store.
- Test serverfunksjoner direkte ved å kalle `loader`/`action` med minimale `Request`-/args-objekter, slik eksisterende route- og API-tester gjør.

## Kommunikasjon

- **Forklar uvanlige mønstre**: Når du bruker funksjoner, API-er eller mønstre som ikke er åpenbare (f.eks. `z.preprocess`, `useInputControl`, `getZodConstraint`), forklar kort hva de gjør og hvorfor de trengs – i svaret til utvikleren, ikke bare i koden.

## Konvensjoner

- **Språk**: Skriv kode og kommentarer på norsk. Commit-meldinger på norsk, imperativ form.
- **Sti-alias**: `~/*` peker til `app/*`.
- **Tester**: `.test.ts(x)` for Vitest, `.spec.ts` for Playwright e2e. Plassér tester ved siden av koden.
- **Styling**: Tailwind CSS + Aksel-komponenter (`@navikt/ds-react`, `@navikt/aksel-icons`).
- **A11y**: Riktige labels, fokusrekkefølge, ARIA der nødvendig.
- **Sikkerhet**: Ikke svekk CSP i `app/sikkerhet/headers.ts` uten vurdering. Aldri committ secrets.
