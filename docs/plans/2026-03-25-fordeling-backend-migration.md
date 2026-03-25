# Fordeling Backend Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate Fordeling to backend-driven sak data and preserve dagens tildelingsflyt by adding a dedicated backend assignment endpoint.

**Architecture:** Fordeling gets its own read-model in frontend instead of reusing the richer mock `Sak` type. Backend `KontrollsakResponse` is mapped to a narrow `FordelingSak` viewmodel in the route loader, while assignment is moved from the mock `SakDetalj` action to a dedicated backend endpoint that transitions the case out of the Fordeling list.

**Tech Stack:** React Router v7, TypeScript, Vitest, Playwright, Spring Boot, Kotlin, JPA, JUnit/Mockito.

---

### Task 1: Add Fordeling read-model tests first

**Files:**

- Create: `watson-sak-frontend/app/fordeling/mapper.test.ts`
- Modify: `watson-sak-frontend/app/fordeling/ufordelte-saker.test.ts`

**Step 1: Write failing mapper tests**

Cover:

- `OPPRETTET` maps to a Fordeling-visible sak
- `AVKLART` maps to a Fordeling-visible sak
- `UTREDES` is excluded from Fordeling
- backend category falls back to neutral display value
- backend `opprettet` instant becomes frontend date string

**Step 2: Run the tests to verify failure**

Run: `npm run test -- app/fordeling/mapper.test.ts app/fordeling/ufordelte-saker.test.ts`

**Step 3: Implement minimal Fordeling-specific types and mapper**

Create:

- `watson-sak-frontend/app/fordeling/types.backend.ts`
- `watson-sak-frontend/app/fordeling/typer.ts`
- `watson-sak-frontend/app/fordeling/mapper.ts`

**Step 4: Re-run the tests**

Run: `npm run test -- app/fordeling/mapper.test.ts app/fordeling/ufordelte-saker.test.ts`

**Step 5: Commit**

```bash
git add app/fordeling/mapper.test.ts app/fordeling/ufordelte-saker.test.ts app/fordeling/types.backend.ts app/fordeling/typer.ts app/fordeling/mapper.ts
git commit -m "Legg til Fordeling-readmodell"
```

### Task 2: Switch Fordeling route to backend read

**Files:**

- Create: `watson-sak-frontend/app/fordeling/api.server.ts`
- Modify: `watson-sak-frontend/app/fordeling/FordelingSide.route.tsx`
- Modify: `watson-sak-frontend/app/fordeling/UfordelteSakerInnhold.tsx`
- Modify: `watson-sak-frontend/app/fordeling/ufordelte-saker.ts`
- Modify: `watson-sak-frontend/app/fordeling/UfordelteSakerInnhold.test.tsx`
- Create: `watson-sak-frontend/app/fordeling/api.server.test.ts`

**Step 1: Write failing API and route-adjacent tests**

Cover:

- frontend fetches `/api/v1/kontrollsaker` with bearer token
- Fordeling content accepts `FordelingSak[]`

**Step 2: Run the tests to verify failure**

Run: `npm run test -- app/fordeling/api.server.test.ts app/fordeling/UfordelteSakerInnhold.test.tsx`

**Step 3: Implement minimal backend client and loader migration**

Requirements:

- use `getBackendOboToken(request)`
- parse backend page response
- map `items` to `FordelingSak[]`
- keep `mockSaksbehandlere` for now
- keep SakDetalj untouched

**Step 4: Re-run the tests**

Run: `npm run test -- app/fordeling/api.server.test.ts app/fordeling/UfordelteSakerInnhold.test.tsx app/fordeling/mapper.test.ts app/fordeling/ufordelte-saker.test.ts`

**Step 5: Commit**

```bash
git add app/fordeling/api.server.ts app/fordeling/api.server.test.ts app/fordeling/FordelingSide.route.tsx app/fordeling/UfordelteSakerInnhold.tsx app/fordeling/UfordelteSakerInnhold.test.tsx app/fordeling/ufordelte-saker.ts
git commit -m "Hent Fordeling-saker fra backend"
```

### Task 3: Add backend assignment API tests first

**Files:**

- Create: `watson-admin-api/src/test/kotlin/no/nav/watson/admin/service/KontrollsakServiceTest.kt`

**Step 1: Write failing backend service tests**

Cover:

- assignment updates `saksbehandler`
- assignment transitions status to `UTREDES`
- assignment updates `oppdatert`

**Step 2: Run the test to verify failure**

Run: `./gradlew test --tests no.nav.watson.admin.service.KontrollsakServiceTest`

**Step 3: Implement minimal backend assignment support**

Modify:

- `watson-admin-api/src/main/kotlin/no/nav/watson/admin/api/KontrollsakController.kt`
- `watson-admin-api/src/main/kotlin/no/nav/watson/admin/api/dto/OppdaterKontrollsakRequest.kt`
- `watson-admin-api/src/main/kotlin/no/nav/watson/admin/service/KontrollsakService.kt`
- `watson-admin-api/src/main/kotlin/no/nav/watson/admin/persistence/entity/KontrollsakEntity.kt`

Add a dedicated assignment operation that returns updated `KontrollsakResponse`.

**Step 4: Re-run the test**

Run: `./gradlew test --tests no.nav.watson.admin.service.KontrollsakServiceTest`

**Step 5: Commit**

```bash
git add src/main/kotlin/no/nav/watson/admin/api/KontrollsakController.kt src/main/kotlin/no/nav/watson/admin/api/dto/OppdaterKontrollsakRequest.kt src/main/kotlin/no/nav/watson/admin/service/KontrollsakService.kt src/main/kotlin/no/nav/watson/admin/persistence/entity/KontrollsakEntity.kt src/test/kotlin/no/nav/watson/admin/service/KontrollsakServiceTest.kt
git commit -m "Legg til backend-tildeling av kontrollsak"
```

### Task 4: Move Fordeling tildeling to backend

**Files:**

- Modify: `watson-sak-frontend/app/fordeling/FordelingSide.route.tsx`
- Modify: `watson-sak-frontend/app/fordeling/api.server.ts`
- Modify: `watson-sak-frontend/app/saker/handlinger/TildelSaksbehandlerModal.tsx`
- Modify: `watson-sak-frontend/app/fordeling/sakshandlinger.spec.ts`
- Create: `watson-sak-frontend/app/fordeling/FordelingSide.route.test.ts`

**Step 1: Write failing frontend tests**

Cover:

- Fordeling action sends assignment request to backend
- modal submits to Fordeling route instead of SakDetalj
- assigned sak disappears after reload because it is no longer Fordeling-visible

**Step 2: Run tests to verify failure**

Run: `npm run test -- app/fordeling/FordelingSide.route.test.ts`

**Step 3: Implement minimal action flow**

Requirements:

- add Fordeling `action()`
- call backend assignment endpoint
- leave modal UX unchanged
- keep button labels and dialog copy unchanged

**Step 4: Re-run tests and Playwright flow**

Run:

- `npm run test -- app/fordeling/FordelingSide.route.test.ts app/fordeling/api.server.test.ts`
- `npm run test:e2e -- app/fordeling/sakshandlinger.spec.ts`

**Step 5: Commit**

```bash
git add app/fordeling/FordelingSide.route.tsx app/fordeling/api.server.ts app/fordeling/FordelingSide.route.test.ts app/saker/handlinger/TildelSaksbehandlerModal.tsx app/fordeling/sakshandlinger.spec.ts
git commit -m "Flytt tildeling i Fordeling til backend"
```

### Task 5: Full verification

**Files:**

- Verify all changed files only

**Step 1: Run frontend checks**

Run:

- `npm run test -- app/fordeling/mapper.test.ts app/fordeling/api.server.test.ts app/fordeling/UfordelteSakerInnhold.test.tsx app/fordeling/ufordelte-saker.test.ts app/fordeling/FordelingSide.route.test.ts`
- `npm run typecheck`

**Step 2: Run backend checks**

Run:

- `./gradlew test --tests no.nav.watson.admin.service.KontrollsakServiceTest`

**Step 3: Run end-to-end regression**

Run:

- `npm run test:e2e -- app/fordeling/sakshandlinger.spec.ts`

**Step 4: Final commit if verification fixes were needed**

```bash
git add .
git commit -m "Verifiser Fordeling-migrering til backend"
```
