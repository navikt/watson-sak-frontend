# Migreringsveileder: kontrakt, beslutningstabell og avklaringer

Sist oppdatert etter fagnotatet «Overføring av saker til nytt
saksbehandlingssystem» (23.09.2026) fra fagansvarlig. Dokumentet er
**frosset kontrakt** for SAK-67 i `watson-admin-api` og `watson-sak-frontend`.
Endringer i kontrakten krever oppdatering her før kode endres.

Ingen fødselsnumre, navn eller saksinnhold fra reelle saker skal inn i chat,
mockdata, tester eller dokumentasjon. Del bare aggregater og faglig tolkning.

Kilder:

- [Research](https://confluence.adeo.no/pages/viewpage.action?pageId=863614195)
- [Løsningsbeskrivelse](https://confluence.adeo.no/pages/viewpage.action?pageId=863618529)
- Arbeidsnotat i `watson-developer`: `docs/notater/legacy-kontroll-db.md`
- Figma: [Sak, node 7841-13534](https://www.figma.com/design/MtreBNojkooH15uhUOPTyB/Sak?node-id=7841-13534)

## 1. Kategorier (beslutningstabell)

En kandidat er én rad i én kildetabell. Kategoriene er disjunkte innenfor
samme tabell. En rad som ikke treffer noen kategori er ikke en
migreringskandidat.

| Kategori               | Kildetabell             | Migreringskilde | Regel                                                                                                                                           | Forventet antall             |
| ---------------------- | ----------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `TIPS_RESTANSE`        | `KT_TABELLPERSON`       | `UTREDNING`     | `TIPSINNDATO IS NOT NULL AND UTREDRES IS NULL`                                                                                                  | 586                          |
| `TIPS_VENTER_RESULTAT` | `KT_TABELLPERSON`       | `UTREDNING`     | `UTREDRES IN ('REV. STRAFFESAK', 'REV. IKKE STRAFFESAK') AND FVRES IS NULL AND PROSJEKTENHET NOT IN ('Spaniakontoret', 'NAV Kontroll analyse')` | 612                          |
| `SV_RESTANSE`          | `KT_TABELLPERSONSTRAFF` | `SV`            | `SVMOTTATT IS NOT NULL AND SVRES IS NULL`                                                                                                       | 434 (420 etter kilderydding) |
| `SV_VENTER_RESULTAT`   | `KT_TABELLPERSONSTRAFF` | `SV`            | `SVRES IN ('Anmeldt', 'Anm. Agiver') AND POLDOMDATO IS NULL AND PROSJEKTIDENT <> 'KA' AND <referansedato> >= 2020-01-01`                        | 637                          |
| `REGISTER_DAGPENGER`   | `NKA_KONTROLL`          | `NKA_DAGPENGER` | `RESULTAT = 'UNDER ARBEID'`                                                                                                                     | 77                           |
| `REGISTER_AAP`         | `NKA_KONTROLL_AAP`      | `NKA_AAP`       | `RESULTAT = 'UNDER ARBEID'`                                                                                                                     | 60                           |

Presiseringer:

- **Null-semantikk.** Tom streng og streng med bare mellomrom behandles som
  `NULL` for alle kodefelt. Kodesammenligning skjer etter `trim()`, med eksakt
  store/små bokstaver som i tabellen.
- **FERDIGDATO** brukes ikke i noen regel.
- **PROSJEKTENHET/PROSJEKTIDENT = NULL** gir ikke eksklusjon. `NOT IN` og `<>`
  gjelder bare utfylte verdier.
- **TIPS_RESTANSE:** saker som henlegges under avklaring skal ha
  `UTREDRES = 'Henlagt, ikke utredet'` i kilden. Fagansvarlig har rettet
  avvik i Access. Koden legger ikke på ekstra filter på `TIPSAVKL`.
- **SV_RESTANSE:** koden implementerer regelen slik den står og gir 434.
  Fagansvarlig har bedt om henleggelse av 12 arbeidsgiveranmeldelser fra før
  2021 i kilden. Når det er gjort, gir samme regel 420. Ingen datofilter i kode.
- **SV_VENTER_RESULTAT:** «Stilt i bero» og «Henleggelse påklaget» kommer med
  når `POLDOMDATO` er tom. `POLDOMRES` er ikke en del av regelen.
- **Referansedato for 2020-grensen** er en navngitt konstant i backend,
  `SV_VENTER_REFERANSEDATOFELT`, foreløpig satt til `SVDATO`. Feltvalget er
  åpent spørsmål (se avsnitt 6). Grensen `2020-01-01` er også en navngitt
  konstant. Rad med tom referansedato blir kandidat med vurdering `MA_AVKLARES`,
  ikke utelatt.
- **Registerkontroll:** alle kontrollister tas med, ikke bare siste
  `KONTROLLISTE`, fordi saksbehandlers åpne saker på eldre lister også skal
  overføres. Omfanget er åpent spørsmål (se avsnitt 6).

### Vurdering per kandidat

| Situasjon                                                          | `vurdering`                          |
| ------------------------------------------------------------------ | ------------------------------------ |
| Alle predikater i kategorien er oppfylt og ingen avvik under       | `MULIG_KANDIDAT`                     |
| `SV_VENTER_RESULTAT` med tom referansedato                         | `MA_AVKLARES`                        |
| `TIPS_RESTANSE` der `TIPSAVKL IN ('Henlagt', 'Henlagt/grunnløst')` | `MA_AVKLARES`                        |
| `SV_RESTANSE` der `SVDATO IS NOT NULL` (dato uten resultat)        | `MA_AVKLARES`                        |
| Registerkandidat der saksbehandlernavn ikke gir entydig NAV-ident  | `MULIG_KANDIDAT` med ansvar `UKJENT` |

### Flagg

- `ekskluderFraStatistikk = true` når `SVRES = 'Anm. Agiver'`. Arbeidsgiveranmeldelser
  behandles av Nav registerforvaltning og skal ikke telle i offisiell statistikk
  om anmeldelse av trygdemisbruk. Flagget vises i UI og følger med ved opprettelse
  når opprettelse åpnes. Lagring på kontrollsak er utenfor denne leveransen.

## 2. Kandidatidentitet

- **Migreringskilde** (`Migreringskilde` i backend, `kilde` i API):
  `UTREDNING`, `SV`, `NKA_DAGPENGER`, `NKA_AAP`. Eksisterende verdier
  `UTREDNING` og `SV` beholdes. Planens arbeidsnavn `TIPS`, `NKA_DP` og
  `NKA_AAP` tilsvarer henholdsvis `UTREDNING`, `NKA_DAGPENGER` og `NKA_AAP`.
- **Nøkkel:** `(legacyKilde, legacyPid)`. `kandidatId` i API er
  `"<Migreringskilde>:<legacyPid>"`, for eksempel `SV:123456`.
- **PID** er et løpenummer per tabell. Det finnes ingen kobling mellom PID i
  tipstabellen og PID i SV-tabellen. Utredning og SV blir aldri slått sammen
  automatisk, verken via PID, TIPSREF eller FNR. SV-PID kobles til SID
  (sakstype og beløp for SV-saken).
- **Format:** `legacyPid` er bare sifre, 1 til 12 tegn (`^[0-9]{1,12}$`).
  Femsifferkravet fra V10 fjernes.

## 3. API-kontrakt

### `GET /api/v1/migrering/kandidater`

Query-parametre:

| Parameter  | Type                         | Standard | Beskrivelse            |
| ---------- | ---------------------------- | -------- | ---------------------- |
| `visning`  | `MINE` \| `UTEN_ANSVARLIG`   | `MINE`   | Hvilken liste          |
| `kategori` | `MigreringKategori`, valgfri | alle     | Filtrer på én kategori |
| `page`     | Int ≥ 1                      | 1        | Som i dag              |
| `size`     | Int 1–100                    | 20       | Som i dag              |

Klienten sender aldri NAV-ident eller enhet. Ukjente query-parametre ignoreres.

`MigreringKandidatResponse` (nye felt markert med ✚):

```kotlin
data class MigreringKandidatResponse(
    val kandidatId: String,              // "<kilde>:<legacyPid>"
    val kilde: String,                   // Migreringskilde
    val legacyPid: String,               // ✚
    val kategori: String,                // ✚ MigreringKategori
    val ansvar: MigreringAnsvarResponse, // type + navIdent (kun BEKREFTET/LOGGTREFF)
    val enhet: String?,                  // ✚ fallback-enhet når ansvar ikke er BEKREFTET
    val vurdering: String,               // MULIG_KANDIDAT | MA_AVKLARES
    val ekskluderFraStatistikk: Boolean, // ✚
    val referansedato: LocalDate?,       // ✚
    val referansedatoFelt: String?,      // ✚ kildefeltets navn, f.eks. "TIPSINNDATO"
    val fase: String,
    val begrunnelse: String,
    val grunnlag: List<MigreringGrunnlagsfeltResponse>,
    val alleredeMigrertTilKontrollsakId: Long?,
    val hentetTidspunkt: Instant,
)
```

`MigreringKandidatPageResponse` får `antallPerKategori: Map<String, Long>` (✚)
for oppsummeringen. Tallene gjelder bare kandidater innlogget bruker har tilgang
til i valgt `visning`, uavhengig av `kategori`-filteret.

Referansedato per kategori: `TIPSINNDATO` for tipskategoriene,
`SVMOTTATT` for `SV_RESTANSE`, `SV_VENTER_REFERANSEDATOFELT` for
`SV_VENTER_RESULTAT`. For registerkategoriene er feltet åpent. Til det er
avklart er `referansedato` og `referansedatoFelt` `null`.

`personIdent` returneres aldri i listen. Navn og ident hentes ved opprettelse
gjennom ordinær personoppslagsflyt.

```kotlin
enum class MigreringKategori {
    TIPS_RESTANSE, TIPS_VENTER_RESULTAT,
    SV_RESTANSE, SV_VENTER_RESULTAT,
    REGISTER_DAGPENGER, REGISTER_AAP,
}
```

### `POST /api/v1/kontrollsaker` (`OpprettKontrollsakRequest`)

Nye valgfrie felt:

```kotlin
val legacyPid: String? = null,             // ^[0-9]{1,12}$
val legacyKilde: Migreringskilde? = null,
```

- Begge eller ingen. Bare ett av feltene gir 400.
- Når feltene er satt, henter backend kandidaten på nytt fra kilden med
  innlogget brukers tilgang. Finnes den ikke, eller har brukeren ikke tilgang,
  svarer backend 404 med samme melding for begge tilfeller.
- `personIdent` i requesten må være lik kandidatens `personIdent`. Avvik gir 400.
- Finnes det allerede en kontrollsak med samme `(legacyKilde, legacyPid)`,
  svarer backend 409 med `kontrollsakId` til eksisterende sak. Den unike indeksen
  er siste skanse ved samtidige innsendinger.
- Frontend sender `legacyPid` og `legacyKilde` videre fra forhåndsutfyllingen.
  Skjulte felt er ikke tillitsgrunnlag: backend validerer alt over.

### Database (Flyway, neste ledige versjon, V26 på `main`)

- `ADD COLUMN legacy_kilde TEXT`
- CHECK `legacy_kilde IN ('UTREDNING','SV','NKA_DAGPENGER','NKA_AAP')`
- CHECK `(legacy_kilde IS NULL) = (legacy_pid IS NULL)`
- Erstatt `kontrollsak_legacy_pid_digits_chk` med `^[0-9]{1,12}$`
- Backfill `legacy_kilde = 'UTREDNING'` der `legacy_pid IS NOT NULL`
- Erstatt `idx_kontrollsak_legacy_pid` med unik indeks på
  `(legacy_kilde, legacy_pid) WHERE legacy_pid IS NOT NULL`
- V10 endres ikke

`findAllByLegacyPid` beholdes for saksøk på tvers av kilder. Oppslag for
«allerede migrert» og duplikatkontroll bruker `(legacyKilde, legacyPid)`.

## 4. Tilgang (🔴 rød sone)

- NAV-ident hentes bare fra validert Azure AD-token (`TokenService`).
- **`MINE`:** ansvar `BEKREFTET` og `ansvar.navIdent` lik innlogget ident.
- **`UTEN_ANSVARLIG`:** ansvar er ikke `BEKREFTET`, kandidaten har `enhet`, og
  innlogget saksbehandlers enhet fra NOM (`NomClient.getSaksbehandler`) er lik
  kandidatens `enhet`. Kandidater uten `enhet` vises ikke for noen. De telles
  som eget avvik i logg for oppfølging.
- **Søkelogg gir aldri tilgang.** `LOGGTREFF` vises bare som informasjon i
  `UTEN_ANSVARLIG` og er aldri grunnlag for `MINE`.
- Personinnsyn sjekkes i tillegg med `TilgangService.sjekkTilgang(personIdent)`
  (populasjon og skjerming). Kandidater brukeren ikke har innsyn i filtreres bort
  før paginering og telling.
- Registerkontroll: saksbehandlernavn kobles mot lokal tabell for NAV-ident.
  Bare entydig treff gir `BEKREFTET`. Ellers `UKJENT` og enhet-fallback.
- Treff og avvisning revisjonslogges som i dag (`AuditLoggService`).

## 5. Frontend

- Seks kategorier vises som faner eller seksjoner etter Figma 7841-13534, med
  antall fra `antallPerKategori`. `MINE` og `UTEN_ANSVARLIG` er et separat valg.
- `types.ts` speiler kontrakten over. Mockdata er syntetisk og dekker alle seks
  kategorier, `MA_AVKLARES` og `ekskluderFraStatistikk`.
- Kandidater med `ekskluderFraStatistikk` får en synlig etikett
  («Arbeidsgiveranmeldelse, holdes utenfor statistikk»).
- Ruten er fortsatt bare tilgjengelig i `local-mock` og `demo` til datakilden er
  avklart. «Opprett sak» åpnes i mock når backend støtter `legacyPid` og
  `legacyKilde`, og viser 409 som «Allerede overført» med lenke til saken.
- `forhåndsutfyll.api.ts` tar imot `legacyPid` og `legacyKilde` i tillegg til FNR.

## 6. Avklaringer

### Besvart av fagansvarlig (23.09.2026)

| Nr. | Spørsmål                 | Svar                                                                                                                                                                                                        |
| --- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Utredning og forvaltning | Venter-på-resultat er `UTREDRES` REV-koder med tom `FVRES`, minus Spaniakontoret og NAV Kontroll analyse (612). FERDIGDATO brukes ikke. Kilden er ryddet for `FVRES`/`FVDATO`-avvik.                        |
| 2   | SV-oppfølging            | Bruk `POLDOMDATO IS NULL`. «Stilt i bero» og «Henleggelse påklaget» uten dato kommer med. Anm. Agiver kommer med, men skal holdes utenfor statistikk. KA holdes utenfor. Saker eldre enn 2020 tas ikke med. |
| 3   | Saksidentitet og kobling | PID er løpenummer per tabell. Ingen kobling mellom tips-PID og SV-PID. SV-PID kobles til SID.                                                                                                               |
| 4   | Ansvar og tilgang        | Saker uten saksbehandler får enhetsnummer, og saksbehandlere i enheten får tilgang. Hvem som setter enhet i kilden er ikke avklart.                                                                         |

### Åpne

| Nr. | Spørsmål                                                                                           | Påvirker                                    |
| --- | -------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| A   | Hvilket datofelt gjelder for grensen «eldre enn 2020» i `SV_VENTER_RESULTAT`? Foreløpig `SVDATO`.  | Konstanten `SV_VENTER_REFERANSEDATOFELT`    |
| B   | Gjelder registerkontroll alle kontrollister eller bare siste `KONTROLLISTE`? Foreløpig alle.       | Regel for `REGISTER_*`                      |
| C   | Datakilde: hvordan kommer Access-data til backend (målmotor, skjema, lesetilgang, frysetidspunkt)? | `MigreringskildeClient`-implementasjon      |
| D   | Er de 12 SV-restansene fra før 2021 henlagt i kilden (434 til 420)?                                | Bare volumkontroll, ikke kode               |
| E   | Hvilken nøkkel og hvilket datofelt har `NKA_KONTROLL` og `NKA_KONTROLL_AAP`?                       | `legacyPid` og `referansedato` for register |
| F   | Skal påklagede henleggelser etter 1.1.2024 tas med selv om `POLDOMDATO` er satt? Foreløpig nei.    | Regel for `SV_VENTER_RESULTAT`              |
| G   | Hvem setter enhet på saker uten saksbehandler i kilden, og hvilken enhet brukes?                   | Dekning i `UTEN_ANSVARLIG`                  |
| 5   | Database og kontrakt: målplattform, read-only-tilgang, oppdatering/frysing.                        | Se C                                        |
| 6   | Ferdig migrert: hvilke felt, notater og vedlegg følger med? Er det bare FNR, PID og saksbehandler? | Opprettelsesflyt og kvittering              |

## 7. Verifisering

- Backend: syntetiske tester for hvert predikat i hver kategori, både positivt
  og negativt, inkludert `NULL` mot tom streng, eksklusjonsverdier, KA,
  datogrensen, Anm. Agiver og `MA_AVKLARES`-tilfellene. Deretter `./gradlew build`.
- Frontend: `pnpm test -- migrering`, deretter `pnpm verify`.
- Volum: en person med tilgang til Access kjører én `COUNT(*)` per kategori mot
  samme snapshot og sammenligner med tabellen i avsnitt 1. Bare aggregater deles.

## Kjente tekniske risikoer

- `SAK-67/migreringsveileder` i backend har duplikat Flyway-versjon V19
  (`V19__chatbot_tabeller.sql` og `V19__dokumentkommentarer.sql`) og mangler
  V24 og V25 fra `main`. Postgres-tester feiler til dette er løst.
- Begge brancher inneholder AI-chatbot-commits (backend `892b970`, frontend
  `f0fbdc3`). De må skilles fra migrerings-PR-ene.
- Frontend-branchen er 52 commits bak `main`, blant annet i `app/registrer-sak/`
  og `app/saker/types.backend.ts`.

## Prøve prototypen

```bash
ENVIRONMENT=local-mock pnpm run dev
```

Åpne `http://localhost:5174/migrering`.
