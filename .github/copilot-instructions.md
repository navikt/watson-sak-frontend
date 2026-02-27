# Copilot Instructions

Watson Sak er en React Router v7-applikasjon (framework mode, SSR) for å administrere saker i Watson. Appen kjører på NAIS/GCP og bruker NAVs designsystem Aksel.

## Kommandoer

- `npm run dev` – utviklingsserver (port 5174)
- `npm run dev:local` – utviklingsserver mot lokal backend
- `npm run build` – produksjonsbygg
- `npm run verify` – kjør **alltid** dette før du anser en oppgave som ferdig (tester, lint, prettier, typecheck, knip)
- `npm run test` – Vitest enhetstester, `npm run test -- app/utils/string-utils.test.ts` for enkeltfil
- `npm run test:e2e` – Playwright e2e-tester, `npx playwright test app/path/to/test.spec.ts` for enkeltfil
- `npm run typecheck` – React Router typegen + tsc
- `npm run lint` / `npm run prettier` – kodekvalitet

## Arkitektur

### Feature-basert struktur

Koden er organisert i feature-mapper under `app/`. Hver feature er en selvstendig modul med egne komponenter, hooks, server-logikk og tester:

```
app/
  auth/              # Autentisering (OBO-tokens via @navikt/oasis)
  layout/            # Root layout, header, footer, ErrorBoundary
  feature-toggling/  # Unleash feature-flagg
  sikkerhet/         # Sikkerhetsheadere, CSP, /.well-known
  tema/              # Lys/mørk modus (cookie-basert)
  config/            # Miljøvariabler (Zod-validert)
  monitorering/      # Helsesjekk, Faro-observability
  analytics/         # Umami-sporing
  utils/             # Delte hjelpefunksjoner
```

Legg ny funksjonalitet i en ny feature-mappe. Bruk `utils/` kun for genuint tverrgående hjelpefunksjoner.

### Ruting

Ruter defineres manuelt i `app/routes.ts` med sentraliserte stier i `app/routeConfig.ts`. Bruk alltid `RouteConfig`-konstantene for lenker og rutedefinisjoner.

### Server/klient-separasjon

- Filer med `.server.ts`-suffiks kjøres kun på serveren.
- Loaders henter data server-side (se `app/layout/loader.server.ts` for mønster med `Promise.all` for parallelle kall).
- Root-loaderen gir brukerinfo, feature-flagg, tema og miljøkonfig til hele appen.

### Autentisering

Bruk hjelpere i `app/auth/` – aldri rull egen auth-logikk:

- `getBackendOboToken(request)` – OBO-token for backend-kall
- `hentInnloggetBruker({ request })` – hent brukerinfo server-side
- `useInnloggetBruker()` – hook for brukerinfo i klientkode

### Miljøvariabler

Valideres med Zod i `app/config/env.server.ts`. Legg til nye variabler i Zod-skjemaet og `.env.example`.

## Konvensjoner

- **Språk**: Skriv kode og kommentarer på norsk. Commit-meldinger på norsk, imperativ form.
- **Sti-alias**: `~/*` peker til `app/*`.
- **Tester**: `.test.ts(x)` for Vitest, `.spec.ts` for Playwright e2e. Plassér tester ved siden av koden.
- **Styling**: Tailwind CSS + Aksel-komponenter (`@navikt/ds-react`, `@navikt/aksel-icons`).
- **A11y**: Riktige labels, fokusrekkefølge, ARIA der nødvendig.
- **Sikkerhet**: Ikke svekk CSP i `app/sikkerhet/headers.ts` uten vurdering. Aldri committ secrets.
