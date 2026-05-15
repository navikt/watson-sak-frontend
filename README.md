# Watson Sak

En React Router-applikasjon for å administrere saker i Watson.

<details>
<summary>TL;DR:</summary>

## Funksjonalitet

TODO

## Teknisk stack

- **Frontend**: React Router v7 Framework Mode med React 19
- **Styling**: Tailwind CSS med Navs designsystem (Aksel)
- **Autentisering**: Azure AD via Oasis
- **Deployment**: NAIS på GCP

</details>

<details>
<summary>Kom i gang</summary>

## Forutsetninger

Du må ha nyeste LTS-versjonen av Node og pnpm installert, i tillegg til browserne til `playwright` (for å kjøre tester).

```bash
brew install node # installerer node om du ikke har det allerede
corepack enable # aktiverer corepack for å bruke pnpm
pnpm exec playwright install # installerer headless browsers for Playwright
```

For utvikling mot lokal backend trenger du også `gcloud` og `k9s`. Se utviklings-seksjonen for mer informasjon om hvordan det settes opp.

## Installasjon

1. Klon repositoriet:

```bash
git clone <repository-url>
cd watson-sak
```

2. Installer avhengigheter:

```bash
pnpm install
```

3. Start utviklingsserveren:

```bash
pnpm run dev
```

4. Åpne [http://localhost:5174](http://localhost:5174) i nettleseren

## Tilgjengelige scripts

- `pnpm run dev` - Starter utviklingsserveren
- `pnpm run dev:local` - Starter utviklingsserveren, men kjører mot lokal backend
- `pnpm run build` - Bygger applikasjonen for produksjon
- `pnpm run start` - Starter produksjonsserveren
- `pnpm run test:e2e` – Kjører ende-til-ende tester
- `pnpm run lint` - Kjører Oxlint
- `pnpm run typecheck` - Kjører TypeScript typesjekk
- `pnpm run format` - Sjekker Oxfmt formatering
- `pnpm run format:fix` - Fikser Oxfmt formatering
- `pnpm run unused` - Sjekker om du har ubrukt kode eller avhengigheter
- `pnpm run verify` – Kjører lint, typecheck, format og unused
</details>

<details>
<summary>Utvikling</summary>

## Kodekvalitet

Prosjektet bruker:

- **Oxlint** for kodekvalitet
- **Oxfmt** for kodeformatering
- **TypeScript** for typesikkerhet
- **Knip** for sjekking av ubrukt kode og avhengigheter
- **Playwright** for å kjøre ende-til-ende tester

## Kjøring mot lokal backend

TODO

## Mockdata

- Opprett sak bruker søkbar person-mockdata fra [`app/testing/mock-store/person-oppslag.server.ts`](app/testing/mock-store/person-oppslag.server.ts).

</details>

<details>
<summary>Deployment</summary>

Applikasjonen deployes automatisk til NAIS på GCP via GitHub Actions.

For deployment til dev-miljøet, kan du kjøre actionen [Deploy manuelt til dev](https://github.com/navikt/watson-sak/actions/workflows/manual-deploy-to-dev.yml) med den branchen du ønsker å deploye. `main`-branchen deployes også til dev hver gang man merger en pull request til `main`.

For deployment til produksjon, lag en [ny release](https://github.com/navikt/watson-sak/releases/new).

### Unleash

Teamet bruker [Unleash](https://docs.nais.io/services/feature-toggling/) for å styre feature toggling. Om du har tilgang, kan du se dashboardet [her](https://holmes-unleash-web.iap.nav.cloud.nais.io/projects/default?limit=25&favoritesFirst=true&sortBy=createdAt&sortOrder=desc). De kan slås av og på i dev og prod, og de kan også styres basert på Nav-identen til den påloggede brukeren.

Husk å fjerne lanserte feature-flagg så snart featuren er lansert (og man ikke ønsker å ha en av-bryter enkelt tilgjengelig).

#### API tokens

For at Unleash skal fungere, trengs det en egen `ApiToken`-ressurs i Nais, som må deployes på egenhånd hver gang applikasjonen settes opp fra bunnen av i nytt miljø.

For å deploye denne ressursen kan man kjøre [en egen GitHub action](https://github.com/navikt/holmes-oppslag-bruker/actions/workflows/deploy-unleash.yml), hvor man velger miljøet man ønsker å deploye til. Den trengs bare å deployes én gang hver gang applikasjonen settes opp fra bunnen av.

### Miljøer

- **Produksjon**: https://watson-sak.intern.nav.no
- **Dev**: https://watson-sak.intern.dev.nav.no
- **Demo**: https://watson-sak-demo.ekstern.dev.nav.no/
- **Utvikling**: Lokal utvikling på https://localhost:5174

</details>

<details>
<summary>Statusmeldinger / varsler</summary>

## Legg ut statusmeldinger via Unleash

TODO: Ikke støttet enda

</details>

<details>
<summary>Kontakt, lisens og legal</summary>

### Kontakt

For spørsmål om tjenesten, koden eller annet, kontakt [#team-holmes](https://nav-it.slack.com/archives/C08CZLL2QKE) på Slack.

### Lisens

Nav sin egen versjon av MIT. Se [LICENSE](LICENSE) filen for detaljer.

### Bruk av AI til utvikling av kode

Teamet benytter seg av AI-tjenester for å utvikle koden i denne applikasjonen. All kode gjennomgås av teamet før det integreres i kodebasen.

</details>
