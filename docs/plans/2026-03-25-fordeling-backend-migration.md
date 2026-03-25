# Implementeringsplan for Fordeling mot backend

**Mål:** Migrere Fordeling til backend-drevet sakdata og bevare dagens tildelingsflyt ved å legge til et dedikert backend-endepunkt for tildeling.

**Arkitektur:** Fordeling får sin egen read-model i frontend i stedet for å gjenbruke den rikere mock-typen `Sak`. Backend-typen `KontrollsakResponse` mappes til en smal `FordelingSak`-viewmodel i route-loaderen, mens tildeling flyttes fra mock-`SakDetalj`-action til et dedikert backend-endepunkt som flytter saken ut av Fordeling-listen.

**Teknologistack:** React Router v7, TypeScript, Vitest, Playwright, Spring Boot, Kotlin, JPA og JUnit/Mockito.

---

### Oppgave 1: Legg til tester for Fordeling-readmodell først

**Filer:**

- Opprett: `watson-sak-frontend/app/fordeling/mapper.test.ts`
- Endre: `watson-sak-frontend/app/fordeling/ufordelte-saker.test.ts`

**Steg 1: Skriv feilende mapper-tester**

- `OPPRETTET` mappes til en sak som er synlig i Fordeling
- `AVKLART` mappes til en sak som er synlig i Fordeling
- `UTREDES` ekskluderes fra Fordeling
- backend-kategori faller tilbake til en nøytral visningsverdi
- backend-verdien `opprettet` blir en datostreng i frontend

**Steg 2: Kjør testene og verifiser at de feiler**

- `npm run test -- app/fordeling/mapper.test.ts app/fordeling/ufordelte-saker.test.ts`

**Steg 3: Implementer minimale Fordeling-spesifikke typer og mapper**

- Opprett: `watson-sak-frontend/app/fordeling/types.backend.ts`
- Opprett: `watson-sak-frontend/app/fordeling/typer.ts`
- Opprett: `watson-sak-frontend/app/fordeling/mapper.ts`

**Steg 4: Kjør testene på nytt**

- `npm run test -- app/fordeling/mapper.test.ts app/fordeling/ufordelte-saker.test.ts`

**Steg 5: Commit**

```bash
git add app/fordeling/mapper.test.ts app/fordeling/ufordelte-saker.test.ts app/fordeling/types.backend.ts app/fordeling/typer.ts app/fordeling/mapper.ts
git commit -m "Legg til Fordeling-readmodell"
```

### Oppgave 2: Bytt Fordeling-rute til backend-lesing

**Filer:**

- Opprett: `watson-sak-frontend/app/fordeling/api.server.ts`
- Endre: `watson-sak-frontend/app/fordeling/FordelingSide.route.tsx`
- Endre: `watson-sak-frontend/app/fordeling/UfordelteSakerInnhold.tsx`
- Endre: `watson-sak-frontend/app/fordeling/ufordelte-saker.ts`
- Endre: `watson-sak-frontend/app/fordeling/UfordelteSakerInnhold.test.tsx`
- Opprett: `watson-sak-frontend/app/fordeling/api.server.test.ts`

**Steg 1: Skriv feilende API- og route-nære tester**

- frontend henter `/api/v1/kontrollsaker` med bearer-token
- Fordeling-innhold aksepterer `FordelingSak[]`

**Steg 2: Kjør testene og verifiser at de feiler**

- `npm run test -- app/fordeling/api.server.test.ts app/fordeling/UfordelteSakerInnhold.test.tsx`

**Steg 3: Implementer minimal backend-klient og loader-migrering**

- bruk `getBackendOboToken(request)`
- parse backend page response
- map `items` til `FordelingSak[]`
- behold `mockSaksbehandlere` midlertidig
- la SakDetalj være urørt

**Steg 4: Kjør testene på nytt**

- `npm run test -- app/fordeling/api.server.test.ts app/fordeling/UfordelteSakerInnhold.test.tsx app/fordeling/mapper.test.ts app/fordeling/ufordelte-saker.test.ts`

**Steg 5: Commit**

```bash
git add app/fordeling/api.server.ts app/fordeling/api.server.test.ts app/fordeling/FordelingSide.route.tsx app/fordeling/UfordelteSakerInnhold.tsx app/fordeling/UfordelteSakerInnhold.test.tsx app/fordeling/ufordelte-saker.ts
git commit -m "Hent Fordeling-saker fra backend"
```

### Oppgave 3: Legg til backend-tester for tildeling først

**Filer:**

- Opprett: `watson-admin-api/src/test/kotlin/no/nav/watson/admin/service/KontrollsakServiceTest.kt`

**Steg 1: Skriv feilende backend-tester**

- tildeling oppdaterer `saksbehandler`
- tildeling flytter status til `UTREDES`
- tildeling oppdaterer `oppdatert`

**Steg 2: Kjør testen og verifiser at den feiler**

- `./gradlew test --tests no.nav.watson.admin.service.KontrollsakServiceTest`

**Steg 3: Implementer minimal backend-støtte for tildeling**

- Endre: `watson-admin-api/src/main/kotlin/no/nav/watson/admin/api/KontrollsakController.kt`
- Endre: `watson-admin-api/src/main/kotlin/no/nav/watson/admin/api/dto/OppdaterKontrollsakRequest.kt`
- Endre: `watson-admin-api/src/main/kotlin/no/nav/watson/admin/service/KontrollsakService.kt`
- Endre: `watson-admin-api/src/main/kotlin/no/nav/watson/admin/persistence/entity/KontrollsakEntity.kt`

**Steg 4: Kjør testen på nytt**

- `./gradlew test --tests no.nav.watson.admin.service.KontrollsakServiceTest`

**Steg 5: Commit**

```bash
git add src/main/kotlin/no/nav/watson/admin/api/KontrollsakController.kt src/main/kotlin/no/nav/watson/admin/api/dto/OppdaterKontrollsakRequest.kt src/main/kotlin/no/nav/watson/admin/service/KontrollsakService.kt src/main/kotlin/no/nav/watson/admin/persistence/entity/KontrollsakEntity.kt src/test/kotlin/no/nav/watson/admin/service/KontrollsakServiceTest.kt
git commit -m "Legg til backend-tildeling av kontrollsak"
```

### Oppgave 4: Flytt tildeling i Fordeling til backend

**Filer:**

- Endre: `watson-sak-frontend/app/fordeling/FordelingSide.route.tsx`
- Endre: `watson-sak-frontend/app/fordeling/api.server.ts`
- Endre: `watson-sak-frontend/app/saker/handlinger/TildelSaksbehandlerModal.tsx`
- Endre: `watson-sak-frontend/app/fordeling/sakshandlinger.spec.ts`
- Opprett: `watson-sak-frontend/app/fordeling/FordelingSide.route.test.ts`

**Steg 1: Skriv feilende frontend-tester**

- Fordeling-action sender tildelingsrequest til backend
- modalen poster til Fordeling-ruten i stedet for SakDetalj
- tildelt sak forsvinner etter reload fordi den ikke lenger er synlig i Fordeling

**Steg 2: Kjør testene og verifiser at de feiler**

- `npm run test -- app/fordeling/FordelingSide.route.test.ts`

**Steg 3: Implementer minimal action-flyt**

- legg til Fordeling-`action()`
- kall backend-endepunkt for tildeling
- behold modal-UX uendret
- behold knappeetiketter og dialogtekst

**Steg 4: Kjør testene og Playwright-flyten på nytt**

- `npm run test -- app/fordeling/FordelingSide.route.test.ts app/fordeling/api.server.test.ts`
- `npm run test:e2e -- app/fordeling/sakshandlinger.spec.ts`

**Steg 5: Commit**

```bash
git add app/fordeling/FordelingSide.route.tsx app/fordeling/api.server.ts app/fordeling/FordelingSide.route.test.ts app/saker/handlinger/TildelSaksbehandlerModal.tsx app/fordeling/sakshandlinger.spec.ts
git commit -m "Flytt tildeling i Fordeling til backend"
```

### Oppgave 5: Full verifisering

**Filer:**

- Verifiser alle endrede filer

**Steg 1: Kjør frontend-sjekker**

- `npm run test -- app/fordeling/mapper.test.ts app/fordeling/api.server.test.ts app/fordeling/UfordelteSakerInnhold.test.tsx app/fordeling/ufordelte-saker.test.ts app/fordeling/FordelingSide.route.test.ts`
- `npm run typecheck`

**Steg 2: Kjør backend-sjekker**

- `./gradlew test --tests no.nav.watson.admin.service.KontrollsakServiceTest`

**Steg 3: Kjør end-to-end-regresjon**

- `npm run test:e2e -- app/fordeling/sakshandlinger.spec.ts`

**Steg 4: Lag en siste commit hvis verifisering krevde justeringer**

```bash
git add .
git commit -m "Verifiser Fordeling-migrering til backend"
```
