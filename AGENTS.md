# Repository Guidelines

Kort veiledning for bidragsytere til watson-sak. Hold koden enkel, domeneorientert og sikker.

## Prosjektstruktur og moduler

- Kildekode: `app/` med feature-pakking (f.eks. `features/fordeling`, `features/avdeling`) og tverrgående (`features/auth`, `features/tema`, `features/layout`, `features/monitorering`).
- Mocks/fixtures: samle i `features/testing` når felles testdata trengs.
- Statiske ressurser: `public/`. Globale stiler: `app/globals.css`.

## Bygg, test og utvikling

- `npm run dev` / `npm run dev:local` – utviklingsserver (lokal backend med `dev:local`).
- `npm run build` → prod-build, `npm run start` → kjør build.
- `npm run typecheck` – React Router typegen + `tsc`.
- `npm run lint` / `npm run lint:fix` – Oxlint.
- `npm run prettier` / `npm run prettier:fix` – Oxfmt formattering.
- `npm run unused` – knip for ubrukte filer/imports.
- `npm run code-quality` – samlet sjekk (lint + prettier + typecheck + unused).
- `npm run test:e2e` (`:headed`/`:ui` for debugging) – Playwright e2e.

## Koding og navngiving

- TypeScript strict; React 19 + React Router v7.
- Skriv på norsk; velg åpenbare løsninger fremfor smarte triks.
- Legg utils nær feature; bruk `features/common` kun for genuint delte helpers. Sti-alias `~/*` peker til `app/*`.
- Følg Oxfmt/Oxlint; ingen manuell linjeformattering. Indentasjon: 2 spaces.
- A11y som default: riktige labels, fokusrekkefølge, ARIA der nødvendig.

## Testing

- Plasser tester ved siden av koden eller i `__tests__` under feature.
- Navngiv e2e-filer etter brukerflyt (f.eks. `sok-oppslag.spec.ts`).
- Kjør minst `npm run lint` og `npm run typecheck` før PR; e2e når flyt/UI endres.

## Commits og pull requests

- Commits: korte, imperativt formulerte beskrivelser (f.eks. `Flytt oppslag-API til featurepakke`).
- PR-innhold: hva/hvorfor, relevante issues, risikovurdering, og skjermbilder/GIF for UI-endringer.
- Hold PR-er små og domenefokuserte; unngå “grab bag”.

## Sikkerhet og konfig

- Behold sikkerhetsheadere i `features/sikkerhet/headers.server.ts`; ikke svekk CSP uten vurdering.
- Hemmeligheter i `.env` (se `.env.example`); aldri committ secrets.
- Bruk auth-hjelpere i `features/auth` for tokenhåndtering/obo; rull ikke egen auth.

## Ferdig er ferdig (Definition of Done)

- Kjør `npm run verify` før en oppgave anses som ferdig.
- Skriv tester for ny funksjonalitet (enhetstester og/eller e2e etter behov).
- Følg TDD der det gir mening: skriv en feilende test først (rød), implementer (grønn), refaktorer.
