# Kontrollsak action area status/blokkering Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Oppdater handlingsområdet på sakdetaljsiden slik at kontrollsaker bruker ny status-/blokkeringsmodell med statusmodal, ventemodal og direkte gjenoppta-knapp.

**Architecture:** `app/saker/types.backend.ts` skal speile den nye backend-kontrakten, mens selve visningsreglene eies lokalt i `SakHandlingerKnapper.tsx` og underkomponentene. `SakDetaljSide.route.tsx` beholder dagens route/fetcher-mønster, men må slutte å bruke gammel `tilgjengeligeHandlinger`/`iBero`/overgangslogikk og i stedet håndtere ny status, ny blokkering og direkte gjenoppta-flyt.

**Tech Stack:** React Router v7, TypeScript, Zod, Aksel, Vitest.

---

## Fastsatte UI-regler

- `AVSLUTTET` viser ingen actions.
- `blokkert !== null` viser kun `Gjenoppta`.
- Ikke-blokkerte, ikke-avsluttede saker viser:
  - `Endre status` som blå `primary`
  - `Sett på vent` som blå `secondary`
- `Endre status` åpner modal med `Select` for alle statuser og valgfri beskrivelse.
- `Sett på vent` åpner modal med `RadioGroup` for blokkeringsårsak og valgfri beskrivelse.
- `Gjenoppta` er en egen knapp uten modal og fjerner blokkeringen direkte.
- Handlingene skal ligge i samme område som dagens action-knapper.

---

## Oppgave 1: Lås frontend-kontrakten til ny status- og blokkeringsmodell

**Files:**

- Modify: `app/saker/types.backend.ts`
- Modify: `app/saker/historikk/typer.ts`
- Modify: `app/saker/visning.ts`
- Modify: `app/saker/selectors.ts`
- Create: `app/saker/types.backend.test.ts`

**Step 1: Skriv feilende kontraktstester**

Legg til tester som verifiserer at frontend kan parse og bruke en kontrollsak med:

- statuser: `OPPRETTET`, `UTREDES`, `STRAFFERETTSLIG_VURDERING`, `ANMELDT`, `HENLAGT`, `AVSLUTTET`
- `blokkert: "VENTER_PA_INFORMASJON" | "VENTER_PA_VEDTAK" | "I_BERO" | null`
- uten `iBero`, `tilgjengeligeHandlinger` og `avslutningskonklusjon`
- historikkfelt med `blokkert` og valgfri `beskrivelse`

**Step 2: Kjør testene og verifiser at de feiler**

```bash
npm run test -- app/saker/types.backend.test.ts
```

Forventet: FAIL fordi dagens schema fortsatt bruker gamle ventestatuser, `iBero`, `tilgjengeligeHandlinger` og `avslutningskonklusjon`.

**Step 3: Skriv minimal implementasjon**

- oppdater `kontrollsakStatusSchema` til ny statusliste
- legg til `blokkeringsarsakSchema`
- fjern `kontrollsakHandlingSchema`, `tilgjengeligHandlingSchema` og felter som ikke lenger kommer fra backend
- legg til `blokkert` på `kontrollsakResponseSchema`
- utvid historikkschema med `blokkert` og `beskrivelse`
- oppdater `visning.ts` og `selectors.ts` bare så langt som nødvendig for å fjerne avhengighet til `iBero` og gamle ventestatuser

**Step 4: Kjør testene på nytt**

```bash
npm run test -- app/saker/types.backend.test.ts
```

Forventet: PASS.

**Step 5: Commit**

```bash
git add app/saker/types.backend.ts app/saker/historikk/typer.ts app/saker/visning.ts app/saker/selectors.ts app/saker/types.backend.test.ts
git commit -m "Oppdater frontend-kontrakt for status og blokkering"
```

---

## Oppgave 2: Oppdater route-actionen til ny detaljflyt

**Files:**

- Modify: `app/saker/SakDetaljSide.route.tsx`
- Create: `app/saker/SakDetaljSide.route.test.tsx`

**Step 1: Skriv feilende route-tester**

Legg til tester for at route-actionen håndterer:

- `endre_status` med `status` og valgfri `beskrivelse`
- `endre_blokkering` med `blokkert` og valgfri `beskrivelse`
- `gjenoppta` som nuller blokkeringen uten modaldata
- at `AVSLUTTET` ikke prøver å holde på gammel blokkeringstilstand

**Step 2: Kjør testene og verifiser at de feiler**

```bash
npm run test -- app/saker/SakDetaljSide.route.test.tsx
```

Forventet: FAIL fordi route-filen fortsatt bruker gammel `KontrollsakHandling`-modell, gamle statusverdier og `sak.iBero`.

**Step 3: Skriv minimal implementasjon**

- fjern gammel `gyldigeStatuser`-liste og erstatt den med ny statusmodell
- fjern gammel `utførStatushandling`-switch for `SETT_VENTER_PA_*`, `SETT_BERO`, `TA_AV_BERO`, `AVSLUTT_MED_KONKLUSJON` og lignende
- behold route-filen som lokal mock/action-adapter, men bytt til nye form-handlinger:
  - `endre_status`
  - `endre_blokkering`
  - `gjenoppta`
- oppdater mock-saken slik at den bruker `sak.blokkert` i stedet for `sak.iBero`
- la eventuell beskrivelse sendes videre til historikken der route-filen allerede legger til hendelser

**Step 4: Kjør testene på nytt**

```bash
npm run test -- app/saker/SakDetaljSide.route.test.tsx
```

Forventet: PASS.

**Step 5: Commit**

```bash
git add app/saker/SakDetaljSide.route.tsx app/saker/SakDetaljSide.route.test.tsx
git commit -m "Oppdater sakdetalj-route til ny statusflyt"
```

---

## Oppgave 3: Bygg nytt handlingsområde for status, vent og gjenoppta

**Files:**

- Modify: `app/saker/handlinger/SakHandlingerKnapper.tsx`
- Modify: `app/saker/handlinger/SakUtredesHandlinger.tsx`
- Modify: `app/saker/handlinger/SakIBeroHandlinger.tsx`
- Modify: `app/saker/handlinger/UfordeltSakHandlinger.tsx`
- Create: `app/saker/handlinger/EndreStatusModal.tsx`
- Create: `app/saker/handlinger/SettPaVentModal.tsx`
- Delete: `app/saker/handlinger/FerdigstillSakModal.tsx`

**Step 1: Skriv feilende komponenttester**

Utvid eller legg til tester som dekker disse synlige reglene:

- ikke-blokkert, ikke-avsluttet sak viser `Endre status` og `Sett på vent`
- blokkert sak viser `Gjenoppta`, men ikke `Endre status`
- `AVSLUTTET` viser ingen actions
- `Endre status` åpner modal med `Select` og felt for valgfri beskrivelse
- `Sett på vent` åpner modal med `RadioGroup` og felt for valgfri beskrivelse
- `Gjenoppta` er en knapp uten modal

**Step 2: Kjør testene og verifiser at de feiler**

```bash
npm run test -- app/saker/handlinger/SakHandlingerKnapper.test.tsx
```

Forventet: FAIL fordi dagens actionområde fortsatt er styrt av `tilgjengeligeHandlinger` og `sak.iBero`.

**Step 3: Skriv minimal implementasjon**

- gjør `SakHandlingerKnapper.tsx` til lokal regissør for nye visningsregler basert på `sak.status`, `sak.blokkert` og om saken har eier
- gjør `SakUtredesHandlinger.tsx` om fra mange enkelthandlinger til den nye status-/vent-flyten
- gjør `SakIBeroHandlinger.tsx` om til én direkte `Gjenoppta`-knapp
- oppdater `UfordeltSakHandlinger.tsx` slik at samme nye status-/vent-logikk brukes også for eierløse saker der det er relevant
- bruk mønsteret fra `TildelSaksbehandlerModal.tsx` for statusmodalen
- bruk mønsteret fra gamle `FerdigstillSakModal.tsx` for ventemodalen
- slett `FerdigstillSakModal.tsx` når nye modaler er koblet inn og filen ikke lenger brukes

**Step 4: Kjør testene på nytt**

```bash
npm run test -- app/saker/handlinger/SakHandlingerKnapper.test.tsx
```

Forventet: PASS.

**Step 5: Commit**

```bash
git add app/saker/handlinger/SakHandlingerKnapper.tsx app/saker/handlinger/SakUtredesHandlinger.tsx app/saker/handlinger/SakIBeroHandlinger.tsx app/saker/handlinger/UfordeltSakHandlinger.tsx app/saker/handlinger/EndreStatusModal.tsx app/saker/handlinger/SettPaVentModal.tsx
git rm app/saker/handlinger/FerdigstillSakModal.tsx
git commit -m "Bygg nytt handlingsomrade for status og vent"
```

---

## Oppgave 4: Fjern gammel handlingsadapter fra frontend

**Files:**

- Modify: `app/saker/handlinger/tilgjengeligeHandlinger.ts`
- Create: `app/saker/handlinger/tilgjengeligeHandlinger.test.ts`

**Step 1: Skriv feilende tester for den nye helperen**

Legg til tester som verifiserer at helperen bare svarer på spørsmål frontend fortsatt trenger, for eksempel:

- om en sak er aktiv (`status !== AVSLUTTET`)
- om en sak er blokkert (`blokkert !== null`)
- at det ikke lenger finnes filterlogikk for backend-sendte `tilgjengeligeHandlinger`

**Step 2: Kjør testene og verifiser at de feiler**

```bash
npm run test -- app/saker/handlinger/tilgjengeligeHandlinger.test.ts
```

Forventet: FAIL fordi filen fortsatt er bygd rundt `KontrollsakHandling` og `sak.tilgjengeligeHandlinger`.

**Step 3: Skriv minimal implementasjon**

- reduser filen til små, rene frontend-regler
- fjern gamle `KontrollsakHandling`-avhengigheter
- behold bare hjelpere som faktisk brukes av actionområdet etter Oppgave 3

**Step 4: Kjør testene på nytt**

```bash
npm run test -- app/saker/handlinger/tilgjengeligeHandlinger.test.ts
```

Forventet: PASS.

**Step 5: Commit**

```bash
git add app/saker/handlinger/tilgjengeligeHandlinger.ts app/saker/handlinger/tilgjengeligeHandlinger.test.ts
git commit -m "Fjern gammel handlingsadapter for kontrollsak"
```

---

## Oppgave 5: Kjør samlet verifisering og manuell QA

**Files:**

- Review all files changed in Oppgave 1-4

**Step 1: Kjør målrettede tester**

```bash
npm run test -- app/saker/types.backend.test.ts app/saker/SakDetaljSide.route.test.tsx app/saker/handlinger/tilgjengeligeHandlinger.test.ts app/saker/handlinger/SakHandlingerKnapper.test.tsx
```

Forventet: PASS.

**Step 2: Kjør typesjekk og bygg**

```bash
npm run typecheck
npm run build
```

Forventet: PASS, begge med exit code 0.

**Step 3: Kjør full verifisering**

```bash
npm run verify
```

Forventet: PASS.

**Step 4: Utfør manuell QA i detaljsiden**

Start appen og verifiser disse konkrete flytene:

- ikke-blokkert sak: `Endre status` og `Sett på vent` vises i samme område som før
- statusmodal: alle statuser finnes i select, og beskrivelse er valgfri
- ventemodal: alle blokkeringsårsaker finnes som radioknapper, og beskrivelse er valgfri
- blokkert sak: bare `Gjenoppta` vises
- avsluttet sak: ingen actions vises

**Step 5: Siste commit**

```bash
git add .
git commit -m "Oppdater handlingsomrade for ny status og blokkering"
```

---

## Acceptance checklist

- `types.backend.ts` matcher ny backend-kontrakt for status, blokkert og historikkbeskrivelse
- `SakDetaljSide.route.tsx` bruker ikke lenger `sak.iBero` eller gamle overgangshandlinger for status/vent
- actionområdet viser kun de avtalte knappene for hver tilstand
- `Endre status` bruker modal med `Select`
- `Sett på vent` bruker modal med `RadioGroup`
- `Gjenoppta` er direkte knapp uten modal
- `AVSLUTTET` viser ingen actions
- `npm run verify` passerer
- manuell QA er kjørt på sakdetaljsiden
