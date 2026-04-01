# Implementeringsplan for migrering fra frontend-Sak til backend-Kontrollsak

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Mål:** Erstatt den gamle frontend-modellen `Sak` med en kanonisk backend-alignet `Kontrollsak`-modell, og flytt all UI-spesifikk shaping til selectors og viewmodels.

**Arkitektur:** `watson-admin-api` er sannhetskilden for sakedata. Frontenden skal ha én delt kontrakt som speiler `KontrollsakResponse`, mens skjermer som Fordeling, Mine saker og Sakdetalj skal bruke små viewmodels og presentasjonshjelpere avledet fra den kontrakten. Felter som bare finnes i dagens frontendmodell skal enten slettes eller utledes lokalt i visningslaget, ikke leve videre som del av domenemodellen.

**Teknologistack:** React Router v7, TypeScript, Zod, Vitest, Playwright, Kotlin, Spring Boot.

---

## Målmodell

Ny kanonisk frontendmodell skal speile backend-responsen i `watson-admin-api/src/main/kotlin/no/nav/watson/admin/api/dto/KontrollsakResponse.kt` og domenet i `watson-admin-api/src/main/kotlin/no/nav/watson/admin/domene/Kontrollsak.kt`.

### Felter som skal finnes i ny modell

- `id`
- `personIdent`
- `saksbehandler`
- `status`
- `kategori`
- `prioritet`
- `mottakEnhet`
- `mottakSaksbehandler`
- `ytelser[]` med `id`, `type`, `periodeFra`, `periodeTil`
- `bakgrunn?` med `id`, `kilde`, `innhold`, `avsender?`, `vedlegg[]`, `tilleggsopplysninger?`
- `resultat?` med `avklaring?`, `utredning?`, `forvaltning?`
- `opprettet`
- `oppdatert?`

### Felter som skal ut av kanonisk frontendmodell

Disse feltene finnes i dagens `watson-sak-frontend/app/saker/typer.ts`, men skal ikke videreføres som del av domenemodellen:

- `datoInnmeldt`
- `kilde` på toppnivå
- `notat`
- `fødselsnummer`
- `ytelser` som `string[]`
- `seksjon`
- `fraDato`
- `tilDato`
- `avdeling`
- `kategori` som fri tekstverdi
- `tags`
- `kontaktinformasjon`
- `beskrivelse`

### Forenklinger i frontend

- statuslabel, tag-variant og tekstlig kategorivisning skal avledes i selectors, ikke ligge i domenemodellen
- periodevisning skal bygges fra `ytelser[].periodeFra` og `ytelser[].periodeTil`
- `bakgrunn.innhold` erstatter lokal bruk av `notat` og `beskrivelse`
- `bakgrunn.avsender` erstatter lokal bruk av `kontaktinformasjon`
- `bakgrunn.kilde` erstatter toppnivå-`kilde`
- view-spesifikke read-modeller som `FordelingSak` kan beholdes, men kun som avledede viewmodels

---

### Oppgave 1: Etabler delt backend-kontrakt for saker

**Filer:**

- Opprett: `watson-sak-frontend/app/saker/types.backend.ts`
- Endre: `watson-sak-frontend/app/fordeling/types.backend.ts`
- Opprett: `watson-sak-frontend/app/saker/kontrakter.test.ts`

**Steg 1: Skriv feilende kontraktstester**

- verifiser at en backend-shapet `KontrollsakResponse` fixture kan parse
- verifiser at `bakgrunn`, `resultat` og `oppdatert` kan være `null`
- verifiser at `ytelser` består av objekter, ikke strenger

**Steg 2: Kjør testene og verifiser at de feiler**

- `npm run test -- app/saker/kontrakter.test.ts`

**Steg 3: Implementer delt backend-kontrakt**

- flytt eller kopier backend-respons-typene fra `app/fordeling/types.backend.ts` til `app/saker/types.backend.ts`
- legg til typer for historikk dersom `KontrollsakHendelseResponse` brukes videre i frontend
- behold `app/fordeling/types.backend.ts` som ren re-export hvis det trengs midlertidig

**Steg 4: Kjør testene på nytt**

- `npm run test -- app/saker/kontrakter.test.ts`

**Steg 5: Commit**

```bash
git add app/saker/types.backend.ts app/saker/kontrakter.test.ts app/fordeling/types.backend.ts
git commit -m "Etabler delt backend-kontrakt for saker"
```

### Oppgave 2: Erstatt gammel `Sak` som kanonisk domenemodell

**Filer:**

- Endre: `watson-sak-frontend/app/saker/typer.ts`
- Opprett: `watson-sak-frontend/app/saker/visning.ts`
- Opprett: `watson-sak-frontend/app/saker/visning.test.ts`

**Steg 1: Skriv feilende tester for visningslogikk**

- backend-status mappes til riktig label
- backend-status mappes til riktig tag-variant
- backend-kategori mappes til riktig visningstekst
- ytelsesperioder kan formateres for UI uten at modellen utvides

**Steg 2: Kjør testene og verifiser at de feiler**

- `npm run test -- app/saker/visning.test.ts`

**Steg 3: Implementer minimal modellopprydding**

- gjør `app/saker/typer.ts` til en tynn backend-alignet typeflate
- flytt labels, formattering og presentasjon til `app/saker/visning.ts`
- slett feltene som bare finnes i legacy-`Sak`

**Steg 4: Kjør testene på nytt**

- `npm run test -- app/saker/visning.test.ts app/saker/kontrakter.test.ts`

**Steg 5: Commit**

```bash
git add app/saker/typer.ts app/saker/visning.ts app/saker/visning.test.ts
git commit -m "Align sak-modellen med backend-kontrakten"
```

### Oppgave 3: Behold Fordeling som viewmodel, ikke domenemodell

**Filer:**

- Endre: `watson-sak-frontend/app/fordeling/mapper.ts`
- Endre: `watson-sak-frontend/app/fordeling/mapper.test.ts`
- Endre: `watson-sak-frontend/app/fordeling/typer.ts`
- Endre: `watson-sak-frontend/app/fordeling/FordelingSide.server.ts`

**Steg 1: Skriv feilende tester som beviser derivert modell**

- `FordelingSak` bygges fra delt `Kontrollsak`-kontrakt
- bare saker med `OPPRETTET` og `AVKLART` blir synlige i Fordeling
- kategori og dato formatteres i mapperen, ikke i domenetypen

**Steg 2: Kjør testene og verifiser at de feiler**

- `npm run test -- app/fordeling/mapper.test.ts`

**Steg 3: Implementer minimal opprydding**

- behold `FordelingSak` som smal viewmodel
- fjern duplisert eierskap til backend-typen i `fordeling`
- gjør loaderen avhengig av delt backend-kontrakt

**Steg 4: Kjør testene på nytt**

- `npm run test -- app/fordeling/mapper.test.ts app/fordeling/UfordelteSakerInnhold.test.tsx`

**Steg 5: Commit**

```bash
git add app/fordeling/mapper.ts app/fordeling/mapper.test.ts app/fordeling/typer.ts app/fordeling/FordelingSide.server.ts
git commit -m "Gjør Fordeling til avledet viewmodel"
```

### Oppgave 4: Lås opprett sak som referanse for backend-alignet inputmodell

**Filer:**

- Endre: `watson-sak-frontend/app/registrer-sak/api.server.ts`
- Endre: `watson-sak-frontend/app/registrer-sak/api.server.test.ts`
- Endre: `watson-sak-frontend/app/registrer-sak/validering.ts`
- Endre: `watson-sak-frontend/app/registrer-sak/RegistrerSakSide.server.ts`

**Steg 1: Skriv feilende kontraktstester for request-mapping**

- formdata mappes til `OpprettKontrollsakRequest`
- `fraDato` og `tilDato` blir til `ytelser[].periodeFra` og `periodeTil`
- `kilde` mappes inn i `bakgrunn`, ikke til toppnivåfelt

**Steg 2: Kjør testene og verifiser at de feiler**

- `npm run test -- app/registrer-sak/api.server.test.ts`

**Steg 3: Implementer minimal tydeliggjøring**

- behold opprett-sak som referanseimplementasjon for skille mellom formmodell og domenemodell
- dokumenter i kode at skjemaets egne felter ikke er del av sakedomenet

**Steg 4: Kjør testene på nytt**

- `npm run test -- app/registrer-sak/api.server.test.ts`

**Steg 5: Commit**

```bash
git add app/registrer-sak/api.server.ts app/registrer-sak/api.server.test.ts app/registrer-sak/validering.ts app/registrer-sak/RegistrerSakSide.server.ts
git commit -m "Lås opprett sak til backend-kontrakten"
```

### Oppgave 5: Migrer Sakdetalj til backend-shapet modell

**Filer:**

- Endre: `watson-sak-frontend/app/saker/SakDetaljSide.route.tsx`
- Endre: `watson-sak-frontend/app/saker/komponenter/SaksinformasjonKort.tsx`
- Opprett: `watson-sak-frontend/app/saker/selectors.ts`
- Opprett: `watson-sak-frontend/app/saker/selectors.test.ts`

**Steg 1: Skriv feilende selector- og komponenttester**

- `personIdent` vises i stedet for `fødselsnummer`
- `opprettet` brukes i stedet for `datoInnmeldt`
- `bakgrunn.innhold` brukes i stedet for `notat` og `beskrivelse`
- `bakgrunn.avsender` brukes i stedet for `kontaktinformasjon`
- `resultat` håndteres null-sikkert

**Steg 2: Kjør testene og verifiser at de feiler**

- `npm run test -- app/saker/selectors.test.ts app/saker/SakDetaljSide.route.test.ts`

**Steg 3: Implementer minimal detaljmigrering**

- flytt all feltoversettelse til selectors
- fjern direkte bruk av legacy-felter i route og komponenter
- bruk backend-status og backend-kategori som kilde for visning

**Steg 4: Kjør testene på nytt**

- `npm run test -- app/saker/selectors.test.ts app/saker/SakDetaljSide.route.test.ts app/saker/sakdetalj.spec.ts`

**Steg 5: Commit**

```bash
git add app/saker/SakDetaljSide.route.tsx app/saker/komponenter/SaksinformasjonKort.tsx app/saker/selectors.ts app/saker/selectors.test.ts
git commit -m "Migrer sakdetalj til backend-modellen"
```

### Oppgave 6: Align historikk med backend-hendelser

**Filer:**

- Endre: `watson-sak-frontend/app/saker/historikk/typer.ts`
- Endre: `watson-sak-frontend/app/saker/historikk/SakHistorikk.tsx`
- Endre: `watson-sak-frontend/app/saker/historikk/mock-data.server.ts`

**Steg 1: Skriv feilende tester for backend-hendelser**

- historikk renderer `hendelsesType`
- historikk renderer `tidspunkt`
- historikk renderer oppdatert status, kategori og prioritet
- frontend slutter å være avhengig av oppdiktede `detaljer.fra`, `detaljer.til` og `detaljer.notat`

**Steg 2: Kjør testene og verifiser at de feiler**

- `npm run test -- app/saker/historikk/*.test.ts*`

**Steg 3: Implementer minimal historikkmigrering**

- modellér frontend-historikk etter backend-eventene
- erstatt gamle mockfelter med backend-nære presentasjonshjelpere

**Steg 4: Kjør testene på nytt**

- `npm run test -- app/saker/historikk/*.test.ts*`

**Steg 5: Commit**

```bash
git add app/saker/historikk/typer.ts app/saker/historikk/SakHistorikk.tsx app/saker/historikk/mock-data.server.ts
git commit -m "Align historikk med backend-hendelser"
```

### Oppgave 7: Forenkle handlinger til backend-støttede flyter

**Filer:**

- Endre: `watson-sak-frontend/app/saker/handlinger/SakHandlingerKnapper.tsx`
- Endre: `watson-sak-frontend/app/saker/handlinger/tilgjengeligeHandlinger.ts`
- Endre: `watson-sak-frontend/app/saker/handlinger/TildelSaksbehandlerModal.tsx`
- Vurder endring eller skjuling av: `EndreStatusModal.tsx`, `HenleggModal.tsx`, `VideresendTilSeksjonModal.tsx`

**Steg 1: Skriv feilende tester for tilgjengelige handlinger**

- handlinger styres av backend-statusverdier
- knapper som bare oppdaterer lokal mock-state blir skjult eller fjernet

**Steg 2: Kjør testene og verifiser at de feiler**

- `npm run test -- app/saker/handlinger/*.test.ts* app/fordeling/sakshandlinger.spec.ts`

**Steg 3: Implementer minimal opprydding**

- behold bare handlinger som faktisk har backendstøtte
- gjør statusstyring eksplisitt mot backend-enumene

**Steg 4: Kjør testene på nytt**

- `npm run test -- app/saker/handlinger/*.test.ts* app/fordeling/sakshandlinger.spec.ts`

**Steg 5: Commit**

```bash
git add app/saker/handlinger/SakHandlingerKnapper.tsx app/saker/handlinger/tilgjengeligeHandlinger.ts app/saker/handlinger/TildelSaksbehandlerModal.tsx app/saker/handlinger/EndreStatusModal.tsx app/saker/handlinger/HenleggModal.tsx app/saker/handlinger/VideresendTilSeksjonModal.tsx
git commit -m "Forenkle sakhandlinger til backend-støttede flyter"
```

### Oppgave 8: Migrer Mine saker til selectors over kanonisk modell

**Filer:**

- Endre: `watson-sak-frontend/app/mine-saker/MineSakerSide.route.tsx`
- Endre: `watson-sak-frontend/app/mine-saker/MineSakerInnhold.tsx`
- Endre: `watson-sak-frontend/app/mine-saker/mock-data.server.ts`
- Opprett: `watson-sak-frontend/app/mine-saker/selectors.test.ts`

**Steg 1: Skriv feilende tester for gruppering og presentasjon**

- gruppering baseres på backend-status
- presentasjon bruker `opprettet`, `kategori`, `ytelser` og `bakgrunn`
- frontend slutter å være avhengig av `kilde`, `fraDato`, `tilDato` og `datoInnmeldt`

**Steg 2: Kjør testene og verifiser at de feiler**

- `npm run test -- app/mine-saker/*.test.ts*`

**Steg 3: Implementer minimal migrering**

- bygg Mine saker som projeksjon over kanonisk kontrollsakmodell
- flytt grupperingsregler til selectors

**Steg 4: Kjør testene på nytt**

- `npm run test -- app/mine-saker/*.test.ts*`

**Steg 5: Commit**

```bash
git add app/mine-saker/MineSakerSide.route.tsx app/mine-saker/MineSakerInnhold.tsx app/mine-saker/mock-data.server.ts app/mine-saker/selectors.test.ts
git commit -m "Migrer mine saker til kanonisk kontrollsakmodell"
```

### Oppgave 9: Migrer søk, statistikk og landingsside bort fra legacy-felter

**Filer:**

- Endre: `watson-sak-frontend/app/søk/søk.server.ts`
- Endre: `watson-sak-frontend/app/søk/SøkResultatKort.tsx`
- Endre: `watson-sak-frontend/app/statistikk/beregninger.ts`
- Endre: `watson-sak-frontend/app/landingsside/beregninger.ts`
- Endre: `watson-sak-frontend/app/landingsside/velkomst.ts`
- Endre: `watson-sak-frontend/app/landingsside/komponenter/MineSakerOversikt.tsx`

**Steg 1: Skriv feilende tester for tverrgående visninger**

- søk fungerer uten `tags`, `seksjon` og `avdeling`
- sammendrag og statistikk bruker backend-status og backend-tidspunkter
- visning av ytelser baserer seg på objekter, ikke `string[]`

**Steg 2: Kjør testene og verifiser at de feiler**

- `npm run test -- app/søk/*.test.ts* app/statistikk/*.test.ts* app/landingsside/*.test.ts*`

**Steg 3: Implementer minimal migrering**

- redefiner søkefelter og sammendrag med utgangspunkt i backend-data
- flytt eventuell presentasjonslogikk til selectors der det passer

**Steg 4: Kjør testene på nytt**

- `npm run test -- app/søk/*.test.ts* app/statistikk/*.test.ts* app/landingsside/*.test.ts*`

**Steg 5: Commit**

```bash
git add app/søk/søk.server.ts app/søk/SøkResultatKort.tsx app/statistikk/beregninger.ts app/landingsside/beregninger.ts app/landingsside/velkomst.ts app/landingsside/komponenter/MineSakerOversikt.tsx
git commit -m "Migrer søk og sammendrag til backend-modellen"
```

### Oppgave 10: Slett legacy-fixtures og død shape-kompatibilitet

**Filer:**

- Endre eller slett: `watson-sak-frontend/app/saker/mock-alle-saker.server.ts`
- Endre eller slett: `watson-sak-frontend/app/mine-saker/mock-data.server.ts`
- Endre eller slett: `watson-sak-frontend/app/saker/historikk/mock-data.server.ts`
- Endre relaterte tester og fixtures

**Steg 1: Skriv feilende tester som bruker backend-shapede fixtures**

- fixtures følger delt `Kontrollsak`-kontrakt
- ingen tester er avhengig av `string[]`-ytelser eller toppnivå-`kilde`

**Steg 2: Kjør testene og verifiser at de feiler**

- `npm run test -- app/saker/**/*.test.ts* app/mine-saker/**/*.test.ts*`

**Steg 3: Implementer minimal opprydding**

- erstatt legacy-mocks med backend-shapede fixtures
- fjern adapterkode som kun eksisterer for å støtte gammel `Sak`

**Steg 4: Kjør testene på nytt**

- `npm run test -- app/saker/**/*.test.ts* app/mine-saker/**/*.test.ts* app/fordeling/**/*.test.ts*`

**Steg 5: Commit**

```bash
git add app/saker/mock-alle-saker.server.ts app/mine-saker/mock-data.server.ts app/saker/historikk/mock-data.server.ts
git commit -m "Fjern legacy sak-modell og gamle fixtures"
```

---

## Teststrategi

### Kontraktstester

- backend-shapet `KontrollsakResponse` fixture parse-er i frontend
- nullable felter håndteres riktig
- `ytelser` består av objekter med perioder

### Selector-tester

- status -> label
- status -> variant
- kategori -> visningstekst
- ytelsesperiode -> visningstekst
- mine-saker-gruppering -> riktig gruppe

### Rute- og komponenttester

- Sakdetalj renderer backend-shapede saker
- historikk renderer backend-hendelser
- Mine saker renderer fra kanonisk modell
- søk og statistikk fungerer uten gamle shape-antagelser

### Verifisering før oppgaven anses som ferdig

- `npm run lint`
- `npm run typecheck`
- `npm run test -- <relevante tester>`
- `npm run test:e2e -- <relevante flyter>` når handlinger eller skjermflyt endres
- `npm run verify` før siste PR eller mergeklar leveranse

---

## Risikoer og åpne spørsmål

- dagens frontend-statusverdier matcher ikke 1:1 med backend-statusene
- noen handlinger i sakdetalj ser ut til å være mock-drevne og må kanskje skjules fremfor å migreres
- `bakgrunn.kilde` kan ha mindre visningsdetalj enn dagens frontend-`kilde`
- perioder på ytelse må vises per ytelse hvis flere ytelser har ulike intervaller

## Anbefalt gjennomføringsrekkefølge

1. Etabler delt backend-kontrakt
2. Bytt ut kanonisk frontendmodell
3. Rydd Fordeling til ren viewmodel
4. Lås Opprett sak som referanseflyt
5. Migrer Sakdetalj
6. Migrer historikk
7. Forenkle handlinger
8. Migrer Mine saker
9. Migrer søk, statistikk og landingsside
10. Slett legacy-compat og gamle fixtures

## Kilder brukt i planen

- `watson-admin-api/src/main/kotlin/no/nav/watson/admin/domene/Kontrollsak.kt`
- `watson-admin-api/src/main/kotlin/no/nav/watson/admin/api/dto/KontrollsakResponse.kt`
- `watson-sak-frontend/app/saker/typer.ts`
- `watson-sak-frontend/app/fordeling/types.backend.ts`
- `watson-sak-frontend/app/fordeling/mapper.ts`
- `watson-sak-frontend/app/registrer-sak/api.server.ts`
- `watson-sak-frontend/app/registrer-sak/validering.ts`
- `watson-sak-frontend/docs/plans/2026-03-25-fordeling-backend-migration.md`
