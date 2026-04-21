# Kontrollsak status-tilstandsmaskin Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Innfør ny kanonisk statusmodell for kontrollsaker i backend først, med eksplisitt tilstandsmaskin, generisk overgangs-endepunkt, `tilgjengeligeHandlinger`, `forrigeStatus` for `I_BERO` og `avslutningskonklusjon` ved `ANMELDT -> AVSLUTTET`, og oppdater deretter frontend til å bruke den nye kontrakten.

**Architecture:** `../watson-admin-api` blir sannhetskilden for både status, lovlige overganger og hvilke handlinger som er tillatt per sak. Frontenden i dette repoet skal ikke lenger utlede lovlige handlinger fra status alene, men rendre UI basert på `tilgjengeligeHandlinger`, mens labels, modaler og presentasjon fortsatt eies lokalt. `I_BERO` modelleres som en pause-status med retur til eksplisitt lagret `forrigeStatus`.

**Tech Stack:** Kotlin, Spring Boot, PostgreSQL, Flyway, MockMvc, JUnit, React Router v7, TypeScript, Zod, Vitest, Playwright.

---

## Fastsatt domenekontrakt

### Kanoniske statuser

- `UFORDELT`
- `TILDELT`
- `UTREDES`
- `VENTER_PA_INFORMASJON`
- `VENTER_PA_VEDTAK`
- `ANMELDELSE_VURDERES`
- `ANMELDT`
- `HENLAGT`
- `AVSLUTTET`
- `I_BERO`

### Fastsatte overgangsregler

- Nye saker starter i `UFORDELT`
- `UFORDELT -> TILDELT | I_BERO`
- `TILDELT -> UTREDES | UFORDELT | I_BERO`
- `UTREDES -> VENTER_PA_INFORMASJON | VENTER_PA_VEDTAK | ANMELDELSE_VURDERES | HENLAGT | I_BERO | UFORDELT(via fristill)`
- `VENTER_PA_INFORMASJON -> UTREDES | I_BERO | UFORDELT(via fristill)`
- `VENTER_PA_VEDTAK -> UTREDES | I_BERO`
- `ANMELDELSE_VURDERES -> ANMELDT | HENLAGT | UTREDES | I_BERO`
- `ANMELDT -> AVSLUTTET`
- `HENLAGT -> AVSLUTTET`
- `AVSLUTTET` er terminal
- `I_BERO` går tilbake til faktisk lagret `forrigeStatus`
- `FRISTILL` er lov fra `TILDELT`, `UTREDES`, `VENTER_PA_INFORMASJON` og `I_BERO`, men ikke når `forrigeStatus == UFORDELT`

### Fastsatte handlinger

- `TILDEL`
- `FRISTILL`
- `START_UTREDNING`
- `SETT_VENTER_PA_INFORMASJON`
- `SETT_VENTER_PA_VEDTAK`
- `SETT_ANMELDELSE_VURDERES`
- `SETT_ANMELDT`
- `SETT_HENLAGT`
- `SETT_I_BERO`
- `FORTSETT_FRA_I_BERO`
- `AVSLUTT_MED_KONKLUSJON`

### Fastsatte feltkrav

- `TILDEL` krever `navIdent`
- `AVSLUTT_MED_KONKLUSJON` krever `avslutningskonklusjon`

### Fastsatte avslutningskonklusjoner

- `POLITIET_HENLA`
- `FRIFUNNET`
- `DOMFELT`

### Anbefalt API-shape

Backend skal returnere:

```json
{
  "status": "TILDELT",
  "avslutningskonklusjon": null,
  "tilgjengeligeHandlinger": [
    {
      "handling": "START_UTREDNING",
      "pakrevdeFelter": [],
      "resultatStatus": "UTREDES"
    },
    {
      "handling": "FRISTILL",
      "pakrevdeFelter": [],
      "resultatStatus": "UFORDELT"
    }
  ]
}
```

Bruk ASCII i feltnavn i kode og JSON:

- `tilgjengeligeHandlinger`
- `pakrevdeFelter`
- `resultatStatus`

---

## Oppgave 1: Lås backend-kontrakt med karakteriseringstester

**Files:**

- Modify: `../watson-admin-api/src/test/kotlin/no/nav/watson/admin/service/KontrollsakServiceTest.kt`
- Modify: `../watson-admin-api/src/test/kotlin/no/nav/watson/admin/api/KontrollsakControllerTest.kt`

**Step 1: Write failing characterization tests for new status model**

Add tests that describe the target behavior before implementation:

- `tildel`-flyt skal ende i `TILDELT`, ikke `UTREDES`
- `fristill` skal være lov fra `TILDELT`, `UTREDES`, `VENTER_PA_INFORMASJON` og `I_BERO`
- `ANMELDT -> AVSLUTTET` skal kreve `avslutningskonklusjon`
- `I_BERO` skal bruke lagret `forrigeStatus`
- controlleren skal ikke lenger eksponere `/tildel` og `/fristill`, men ett generisk overgangs-endepunkt

**Step 2: Run tests to verify they fail**

Run from `../watson-admin-api`:

```bash
./gradlew test --tests "no.nav.watson.admin.service.KontrollsakServiceTest" --tests "no.nav.watson.admin.api.KontrollsakControllerTest"
```

Expected: FAIL because dagens enum, service og controller fortsatt bruker `FORVALTNING`, `tildel`, `fristill` og mangler ny overgangskontrakt.

**Step 3: Commit**

```bash
git add ../watson-admin-api/src/test/kotlin/no/nav/watson/admin/service/KontrollsakServiceTest.kt ../watson-admin-api/src/test/kotlin/no/nav/watson/admin/api/KontrollsakControllerTest.kt
git commit -m "Beskriv ny statusflyt i tester"
```

---

## Oppgave 2: Innfør domenetyper for handlinger, konklusjon og tilstandsmaskin

**Files:**

- Modify: `../watson-admin-api/src/main/kotlin/no/nav/watson/admin/domene/Kontrollsak.kt`
- Modify: `../watson-admin-api/src/main/kotlin/no/nav/watson/admin/domene/HendelsesType.kt`
- Create: `../watson-admin-api/src/main/kotlin/no/nav/watson/admin/domene/KontrollsakHandling.kt`
- Create: `../watson-admin-api/src/main/kotlin/no/nav/watson/admin/domene/Avslutningskonklusjon.kt`
- Create: `../watson-admin-api/src/main/kotlin/no/nav/watson/admin/service/KontrollsakTilstandsmaskin.kt`
- Create: `../watson-admin-api/src/test/kotlin/no/nav/watson/admin/service/KontrollsakTilstandsmaskinTest.kt`

**Step 1: Write the failing state-machine tests**

Add explicit tests for:

- `UFORDELT` exposes `TILDEL` and `SETT_I_BERO`
- `TILDELT` exposes `START_UTREDNING`, `FRISTILL`, `SETT_I_BERO`
- `UTREDES` exposes all agreed actions
- `I_BERO` exposes `FORTSETT_FRA_I_BERO`, and `FRISTILL` only when `forrigeStatus != UFORDELT`
- `ANMELDT` exposes only `AVSLUTT_MED_KONKLUSJON`
- `HENLAGT` exposes only `AVSLUTT_MED_KONKLUSJON` or a dedicated `AVSLUTT` action decision; use `AVSLUTT_MED_KONKLUSJON` only for `ANMELDT`, and a plain `AVSLUTT` action if needed

**Implementation note:** To avoid overloading one action with two meanings, introduce a plain `AVSLUTT` handling for `HENLAGT -> AVSLUTTET` if the code becomes unclear. If not needed, keep one action enum per real UI action. Choose the simpler model once tests are in place.

**Step 2: Run test to verify it fails**

Run from `../watson-admin-api`:

```bash
./gradlew test --tests "no.nav.watson.admin.service.KontrollsakTilstandsmaskinTest"
```

Expected: FAIL because `KontrollsakTilstandsmaskin` and the new enums do not exist yet.

**Step 3: Write minimal implementation**

- Replace `FORVALTNING` with the new status set in `KontrollsakStatus`
- Extend `Kontrollsak` with nullable `forrigeStatus` and `avslutningskonklusjon`
- Add `KontrollsakHandling` and `Avslutningskonklusjon`
- Implement `KontrollsakTilstandsmaskin` with:
  - `fun tilgjengeligeHandlingerFor(sak: Kontrollsak): List<TilgjengeligHandling>`
  - `fun utforHandling(sak: Kontrollsak, handling: KontrollsakHandling, payload: OvergangPayload): Kontrollsak`

**Step 4: Run tests to verify they pass**

```bash
./gradlew test --tests "no.nav.watson.admin.service.KontrollsakTilstandsmaskinTest"
```

Expected: PASS.

**Step 5: Commit**

```bash
git add ../watson-admin-api/src/main/kotlin/no/nav/watson/admin/domene/Kontrollsak.kt ../watson-admin-api/src/main/kotlin/no/nav/watson/admin/domene/HendelsesType.kt ../watson-admin-api/src/main/kotlin/no/nav/watson/admin/domene/KontrollsakHandling.kt ../watson-admin-api/src/main/kotlin/no/nav/watson/admin/domene/Avslutningskonklusjon.kt ../watson-admin-api/src/main/kotlin/no/nav/watson/admin/service/KontrollsakTilstandsmaskin.kt ../watson-admin-api/src/test/kotlin/no/nav/watson/admin/service/KontrollsakTilstandsmaskinTest.kt
git commit -m "Legg til tilstandsmaskin for kontrollsak"
```

---

## Oppgave 3: Lagre forrige status og avslutningskonklusjon i databasen

**Files:**

- Modify: `../watson-admin-api/src/main/kotlin/no/nav/watson/admin/persistence/entity/KontrollsakEntity.kt`
- Modify: `../watson-admin-api/src/main/kotlin/no/nav/watson/admin/persistence/mapper/KontrollsakMapper.kt`
- Modify: `../watson-admin-api/src/main/kotlin/no/nav/watson/admin/service/KontrollsakService.kt`
- Create: `../watson-admin-api/src/main/resources/db/migration/V6__oppdater_kontrollsak_statusmodell.sql`

**Step 1: Write the failing migration and mapper tests**

Extend existing service tests or create focused tests that fail until these conditions are true:

- `KontrollsakEntity` can persist `forrigeStatus`
- `KontrollsakEntity` can persist `avslutningskonklusjon`
- existing `FORVALTNING` rows migrate to `VENTER_PA_VEDTAK`
- `I_BERO` survives migration unchanged

**Step 2: Run tests to verify they fail**

Run from `../watson-admin-api`:

```bash
./gradlew test --tests "no.nav.watson.admin.service.KontrollsakServiceTest"
```

Expected: FAIL because entity, mapper and schema do not yet support the new fields.

**Step 3: Write minimal implementation**

- Add nullable columns `forrige_status` and `avslutningskonklusjon`
- Update `kontrollsak_status_chk`
- Migrate `FORVALTNING` to `VENTER_PA_VEDTAK`
- Keep `AVSLUTTET` and `I_BERO` unchanged
- Update entity and mapper round-trip

**Recommended migration sketch:**

```sql
ALTER TABLE kontrollsak DROP CONSTRAINT kontrollsak_status_chk;

UPDATE kontrollsak
SET status = 'VENTER_PA_VEDTAK'
WHERE status = 'FORVALTNING';

ALTER TABLE kontrollsak
  ADD COLUMN forrige_status TEXT,
  ADD COLUMN avslutningskonklusjon TEXT;

ALTER TABLE kontrollsak
  ADD CONSTRAINT kontrollsak_status_chk CHECK (
    status IN (
      'UFORDELT', 'TILDELT', 'UTREDES', 'VENTER_PA_INFORMASJON',
      'VENTER_PA_VEDTAK', 'ANMELDELSE_VURDERES', 'ANMELDT',
      'HENLAGT', 'AVSLUTTET', 'I_BERO'
    )
  );
```

**Step 4: Run tests to verify they pass**

```bash
./gradlew test --tests "no.nav.watson.admin.service.KontrollsakServiceTest"
./gradlew build
```

Expected: PASS, then build exits 0.

**Step 5: Commit**

```bash
git add ../watson-admin-api/src/main/kotlin/no/nav/watson/admin/persistence/entity/KontrollsakEntity.kt ../watson-admin-api/src/main/kotlin/no/nav/watson/admin/persistence/mapper/KontrollsakMapper.kt ../watson-admin-api/src/main/kotlin/no/nav/watson/admin/service/KontrollsakService.kt ../watson-admin-api/src/main/resources/db/migration/V6__oppdater_kontrollsak_statusmodell.sql
git commit -m "Lagre forrige status og avslutningskonklusjon"
```

---

## Oppgave 4: Innfør nytt overgangs-endepunkt og ny responskontrakt i backend

**Files:**

- Modify: `../watson-admin-api/src/main/kotlin/no/nav/watson/admin/api/KontrollsakController.kt`
- Modify: `../watson-admin-api/src/main/kotlin/no/nav/watson/admin/api/dto/KontrollsakResponse.kt`
- Modify: `../watson-admin-api/src/main/kotlin/no/nav/watson/admin/api/mapper/KontrollsakResponseMapper.kt`
- Modify: `../watson-admin-api/src/main/kotlin/no/nav/watson/admin/service/KontrollsakService.kt`
- Create: `../watson-admin-api/src/main/kotlin/no/nav/watson/admin/api/dto/EndreKontrollsakStatusRequest.kt`
- Create: `../watson-admin-api/src/main/kotlin/no/nav/watson/admin/api/dto/TilgjengeligHandlingResponse.kt`
- Delete: `../watson-admin-api/src/main/kotlin/no/nav/watson/admin/api/dto/TildelKontrollsakRequest.kt`

**Step 1: Write failing controller tests for the new endpoint**

Add tests for:

- `POST /api/v1/kontrollsaker/{sakId}/overgang` with `TILDEL` and `navIdent`
- `POST /api/v1/kontrollsaker/{sakId}/overgang` with `AVSLUTT_MED_KONKLUSJON`
- response contains `status`, `avslutningskonklusjon` and `tilgjengeligeHandlinger`
- old `/tildel` and `/fristill` endpoints are gone

**Step 2: Run tests to verify they fail**

```bash
./gradlew test --tests "no.nav.watson.admin.api.KontrollsakControllerTest"
```

Expected: FAIL because endpoint and DTOs do not exist yet.

**Step 3: Write minimal implementation**

- Add `EndreKontrollsakStatusRequest` with fields:
  - `handling`
  - `navIdent: String?`
  - `avslutningskonklusjon: Avslutningskonklusjon?`
- Add `TilgjengeligHandlingResponse`
- Extend `KontrollsakResponse` with:
  - `avslutningskonklusjon: String?`
  - `tilgjengeligeHandlinger: List<TilgjengeligHandlingResponse>`
- Replace `/tildel` and `/fristill` with `/overgang`
- Make service return the full updated case after transition

**Step 4: Run tests to verify they pass**

```bash
./gradlew test --tests "no.nav.watson.admin.api.KontrollsakControllerTest"
```

Expected: PASS.

**Step 5: Commit**

```bash
git add ../watson-admin-api/src/main/kotlin/no/nav/watson/admin/api/KontrollsakController.kt ../watson-admin-api/src/main/kotlin/no/nav/watson/admin/api/dto/KontrollsakResponse.kt ../watson-admin-api/src/main/kotlin/no/nav/watson/admin/api/dto/EndreKontrollsakStatusRequest.kt ../watson-admin-api/src/main/kotlin/no/nav/watson/admin/api/dto/TilgjengeligHandlingResponse.kt ../watson-admin-api/src/main/kotlin/no/nav/watson/admin/api/mapper/KontrollsakResponseMapper.kt ../watson-admin-api/src/main/kotlin/no/nav/watson/admin/service/KontrollsakService.kt
git commit -m "Erstatt tildel og fristill med overgangs-endepunkt"
```

---

## Oppgave 5: Koble hendelser, Postman og backend-verifisering til den nye modellen

**Files:**

- Modify: `../watson-admin-api/src/main/kotlin/no/nav/watson/admin/domene/HendelsesType.kt`
- Modify: `../watson-admin-api/postman/Watson Admin API.postman_collection.json`
- Modify: `../watson-admin-api/src/test/kotlin/no/nav/watson/admin/service/KontrollsakServiceTest.kt`
- Modify: `../watson-admin-api/src/test/kotlin/no/nav/watson/admin/api/KontrollsakControllerTest.kt`

**Step 1: Write failing tests for emitted events**

Add or extend tests so they assert concrete event types for the new transition flow. At minimum verify events for:

- `SAK_TILDELT`
- `SAK_FRISTILT`
- `SAK_STATUS_ENDRET` or similarly named generic transition event if you choose a generic event model

**Decision rule:** Prefer one generic status-endret event over many narrow event types unless downstream consumers need per-action semantics now.

**Step 2: Run tests to verify they fail**

```bash
./gradlew test --tests "no.nav.watson.admin.service.KontrollsakServiceTest"
```

Expected: FAIL until event publishing matches the new transition model.

**Step 3: Implement minimal event and Postman updates**

- Update event publishing
- Update Postman collection to use `/overgang`
- Remove obsolete `/tildel` and `/fristill` examples

**Step 4: Run full backend verification**

```bash
./gradlew test --tests "no.nav.watson.admin.service.KontrollsakServiceTest" --tests "no.nav.watson.admin.api.KontrollsakControllerTest"
./gradlew build
```

Expected: PASS and build exits 0.

**Step 5: Commit**

```bash
git add ../watson-admin-api/src/main/kotlin/no/nav/watson/admin/domene/HendelsesType.kt ../watson-admin-api/postman/Watson Admin API.postman_collection.json ../watson-admin-api/src/test/kotlin/no/nav/watson/admin/service/KontrollsakServiceTest.kt ../watson-admin-api/src/test/kotlin/no/nav/watson/admin/api/KontrollsakControllerTest.kt
git commit -m "Oppdater hendelser og api-eksempler for ny statusflyt"
```

---

## Oppgave 6: Lås frontend-kontrakt for status, handlinger og konklusjon

**Files:**

- Modify: `app/saker/types.backend.ts`
- Create: `app/saker/kontrakter-status.test.ts`

**Step 1: Write the failing frontend contract tests**

Verify that frontend can parse a backend case containing:

- new statuses like `TILDELT` and `VENTER_PA_VEDTAK`
- `tilgjengeligeHandlinger`
- `pakrevdeFelter`
- `avslutningskonklusjon`

**Step 2: Run test to verify it fails**

```bash
npm run test -- app/saker/kontrakter-status.test.ts
```

Expected: FAIL because the Zod schema still allows only the old statuses and lacks the new fields.

**Step 3: Write minimal implementation**

- Replace the old `kontrollsakStatusSchema`
- Add `kontrollsakHandlingSchema`
- Add `avslutningskonklusjonSchema`
- Add schema/type for `tilgjengeligeHandlinger`
- Extend `kontrollsakResponseSchema`

**Step 4: Run tests to verify they pass**

```bash
npm run test -- app/saker/kontrakter-status.test.ts app/saker/visning.test.ts
```

Expected: PASS for the new contract test, and existing view tests may fail until labels are updated.

**Step 5: Commit**

```bash
git add app/saker/types.backend.ts app/saker/kontrakter-status.test.ts
git commit -m "Oppdater frontend-kontrakt for ny statusmodell"
```

---

## Oppgave 7: Oppdater frontend visning, gruppering og statistikk

**Files:**

- Modify: `app/saker/visning.ts`
- Modify: `app/saker/selectors.ts`
- Modify: `app/saker/selectors.test.ts`
- Modify: `app/mine-saker/selectors.test.ts`
- Modify: `app/statistikk/beregninger.ts`
- Modify: `app/statistikk/beregninger.test.ts`
- Modify: `app/landingsside/velkomst.ts`
- Modify: `app/landingsside/velkomst.test.ts`
- Modify: `app/landingsside/loader.server.ts`
- Modify: `app/landingsside/loader.server.test.ts`

**Step 1: Write the failing grouping and statistics tests**

Capture the agreed frontend grouping:

- aktive: `TILDELT`, `UTREDES`, `ANMELDELSE_VURDERES`
- ventende: `I_BERO`, `VENTER_PA_INFORMASJON`, `VENTER_PA_VEDTAK`
- fullførte: `ANMELDT`, `HENLAGT`, `AVSLUTTET`
- `UFORDELT` skal ikke vises i mine saker

Also add explicit tests for all new labels and status variants.

**Step 2: Run tests to verify they fail**

```bash
npm run test -- app/saker/visning.test.ts app/saker/selectors.test.ts app/mine-saker/selectors.test.ts app/statistikk/beregninger.test.ts app/landingsside/velkomst.test.ts app/landingsside/loader.server.test.ts
```

Expected: FAIL because the frontend still assumes `FORVALTNING` and the old grouping.

**Step 3: Write minimal implementation**

- Update labels and tag variants in `app/saker/visning.ts`
- Update `getMineSakerGruppeStatus` in `app/saker/selectors.ts`
- Update `beregnAntallPerStatus` to initialize all new statuses
- Update landing page logic to respect the new active/ventende/fullførte model

**Step 4: Run tests to verify they pass**

```bash
npm run test -- app/saker/visning.test.ts app/saker/selectors.test.ts app/mine-saker/selectors.test.ts app/statistikk/beregninger.test.ts app/landingsside/velkomst.test.ts app/landingsside/loader.server.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add app/saker/visning.ts app/saker/selectors.ts app/saker/selectors.test.ts app/mine-saker/selectors.test.ts app/statistikk/beregninger.ts app/statistikk/beregninger.test.ts app/landingsside/velkomst.ts app/landingsside/velkomst.test.ts app/landingsside/loader.server.ts app/landingsside/loader.server.test.ts
git commit -m "Oppdater visning og gruppering for ny statusmodell"
```

---

## Oppgave 8: Flytt frontend-handlingslogikk over på backendens `tilgjengeligeHandlinger`

**Files:**

- Modify: `app/saker/SakDetaljSide.route.tsx`
- Modify: `app/saker/handlinger/tilgjengeligeHandlinger.ts`
- Modify: `app/saker/handlinger/tilgjengeligeHandlinger.test.ts`
- Modify: `app/saker/handlinger/SakHandlingerKnapper.tsx`
- Modify: `app/saker/handlinger/SakHandlingerKnapper.test.tsx`
- Modify: `app/saker/handlinger/TildelSaksbehandlerModal.tsx`
- Modify: `app/saker/handlinger/FerdigstillSakModal.tsx`
- Modify: `app/saker/handlinger/UfordeltSakHandlinger.tsx`
- Modify: `app/saker/handlinger/SakUtredesHandlinger.tsx`
- Modify: `app/saker/handlinger/SakIBeroHandlinger.tsx`

**Step 1: Write the failing UI behavior tests**

Cover these cases:

- buttons render from `tilgjengeligeHandlinger`, not from hardcoded status switches
- `TILDEL` opens UI for `navIdent`
- `AVSLUTT_MED_KONKLUSJON` opens UI for `avslutningskonklusjon`
- unknown actions are ignored safely
- `FORTSETT_FRA_I_BERO` uses the backend-provided action, not frontend-derived previous status logic

**Step 2: Run tests to verify they fail**

```bash
npm run test -- app/saker/handlinger/tilgjengeligeHandlinger.test.ts app/saker/handlinger/SakHandlingerKnapper.test.tsx
```

Expected: FAIL because the current action layer still derives legality from status.

**Step 3: Write minimal implementation**

- Convert `app/saker/handlinger/tilgjengeligeHandlinger.ts` into a thin adapter from backend action enums to local UI metadata
- Remove hardcoded legality checks where possible
- Keep frontend ownership of labels and modals
- Use the new backend `/overgang` endpoint from the detail page and list actions

**Step 4: Run tests to verify they pass**

```bash
npm run test -- app/saker/handlinger/tilgjengeligeHandlinger.test.ts app/saker/handlinger/SakHandlingerKnapper.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add app/saker/SakDetaljSide.route.tsx app/saker/handlinger/tilgjengeligeHandlinger.ts app/saker/handlinger/tilgjengeligeHandlinger.test.ts app/saker/handlinger/SakHandlingerKnapper.tsx app/saker/handlinger/SakHandlingerKnapper.test.tsx app/saker/handlinger/TildelSaksbehandlerModal.tsx app/saker/handlinger/FerdigstillSakModal.tsx app/saker/handlinger/UfordeltSakHandlinger.tsx app/saker/handlinger/SakUtredesHandlinger.tsx app/saker/handlinger/SakIBeroHandlinger.tsx
git commit -m "Bruk tilgjengelige handlinger fra backend i frontend"
```

---

## Oppgave 9: Oppdater mocks, fixtures og ende-til-ende-støtte

**Files:**

- Modify: `app/testing/mock-store/saker/fordeling.server.ts`
- Modify: `app/testing/mock-store/saker/mine-saker.server.ts`
- Modify: `app/saker/mock-uuid.ts`
- Modify: relevante e2e-filer som bruker gamle statuser

**Step 1: Write failing mock/fixture tests where needed**

At minimum verify that fixture data no longer emits `FORVALTNING` and instead emits the new agreed statuses.

**Step 2: Run tests to verify they fail**

```bash
npm run test -- app/saker/mock-uuid.test.ts app/landingsside/beregninger.test.ts
```

Expected: FAIL until fixture normalization and statuses are aligned.

**Step 3: Write minimal implementation**

- Update hardcoded mock statuses
- Remove legacy status normalization that maps to `FORVALTNING`
- Keep only the minimal compatibility mapping still needed for local mock data

**Step 4: Run tests to verify they pass**

```bash
npm run test -- app/saker/mock-uuid.test.ts app/landingsside/beregninger.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add app/testing/mock-store/saker/fordeling.server.ts app/testing/mock-store/saker/mine-saker.server.ts app/saker/mock-uuid.ts
git commit -m "Oppdater mockdata til ny statusmodell"
```

---

## Oppgave 10: Kjør samlet verifisering og rydd opp i gamle overganger

**Files:**

- Review all files changed in Oppgave 1-9
- Delete any now-unused frontend helpers or backend DTOs only after tests are green

**Step 1: Run backend verification**

Run from `../watson-admin-api`:

```bash
./gradlew build
```

Expected: PASS, exit code 0.

**Step 2: Run frontend verification**

```bash
npm run verify
```

Expected: PASS, exit code 0.

**Step 3: Run relevant e2e or targeted UI checks**

```bash
npm run test:e2e
```

Expected: PASS, or if the suite is too broad, run the specific sak/fordeling flows touched by the change and record which specs were run.

**Step 4: Remove dead code only after green verification**

- remove dead status branches for `FORVALTNING`
- remove old frontend assumptions tied to `/tildel` and `/fristill`
- remove obsolete backend request DTOs if they remain unused

**Step 5: Final commit**

```bash
git add .
git commit -m "Fullfor ny statusmaskin for kontrollsaker"
```

---

## Acceptance checklist

- Backend persists the full new status set and rejects invalid transitions
- `I_BERO` returns to stored `forrigeStatus`
- `ANMELDT -> AVSLUTTET` requires and persists `avslutningskonklusjon`
- Backend returns `tilgjengeligeHandlinger` on both list and detail responses
- Backend no longer exposes `/tildel` and `/fristill`
- Frontend no longer decides legal transitions from status alone
- Mine saker grouping matches the agreed active/ventende/fullførte rules
- Statistics and landing page no longer assume `FORVALTNING`
- `npm run verify` passes in this repo
- `./gradlew build` passes in `../watson-admin-api`

## Notes for implementation

- Keep backend changes small and mergeable; do not mix migration, API contract and frontend cleanup in one giant diff.
- If `AVSLUTT` becomes clearer than overloading `AVSLUTT_MED_KONKLUSJON`, prefer clarity over theoretical minimalism.
- Do not infer `forrigeStatus` from historikk; store it explicitly.
- Do not send labels from backend. Keep frontend text local.
