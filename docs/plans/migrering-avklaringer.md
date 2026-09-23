# Migreringsveileder: prototype og avklaringer før backend

## Status

Frontend er en **lese-/klikkeprototype**, ikke en statusmotor eller ferdig
migreringsflyt. Eksemplene er syntetiske og inneholder ikke FNR. Ingen sak,
tildeling, godkjenning eller migreringskvittering lagres.

- Tilgjengelig i `local-mock` og `demo`. Loaderen returnerer 404 i miljøer
  med ekte backend, og menypunktet skjules i disse miljøene.
- «Mine saker» bygger på simulert bekreftet ansvar for innlogget bruker.
  Søkeloggtreff ligger under «Uten bekreftet ansvarlig», ikke under egne saker.
- «Mulig kandidat» / «Må avklares» er forhåndsdefinerte visningseksempler,
  **ikke** godkjente regler kjørt på ekte data.
- «Se grunnlag» viser kildetype, PID, begrunnelse og syntetiske status-/datofelt.
  Utredning og SV har separate rader selv ved lik PID.
- Søk og vurderingsfilter gjelder mocklisten. Antall i fanene er mockantall.
- Et eget utfellbart kort viser målte delutvalg **1 396 (674 + 722)** og
  **580 + 4**, tydelig skilt fra mockdata og endelig migreringsvolum.
- «Opprett sak» er sperret. Tidligere POST til generell FNR-forhåndsutfylling
  er fjernet: den ignorerte PID og kunne ikke sikre migreringssporbarhet.
- Ingen «Opprettet i Access»-dato eller grønn «Overført»-status presenteres
  som fakta før datotolkning og faktisk opprettelses-/kvitteringsflyt er avklart.

Kilde:

- [Research](https://confluence.adeo.no/pages/viewpage.action?pageId=863614195)
- [Løsningsbeskrivelse](https://confluence.adeo.no/pages/viewpage.action?pageId=863618529)
- Arbeidsnotat i `watson-developer`: `docs/notater/legacy-kontroll-db.md`.

## Prioriterte avklaringer

| Prioritet | Spørsmål                                                                                                  | Hvem / hvordan                                                     | Leveranse som trengs                                                           |
| --------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| 1         | Er 1 396 REV-rader uten FVRES/FVDATO/FERDIGDATO riktig utgangspunkt for venting? Kan de være uoppdaterte? | Fagansvarlig + kontroll av noen saker i Access                     | Regel for venting vs. manglende registrering, med unntak                       |
| 1         | Tar utfylt FVRES posten ut av «venter», og hvor følges resten opp?                                        | Fagansvarlig, sammenhold utredning og SV i Access                  | Faseovergang, uten automatisk å erklære hele saken avsluttet                   |
| 1         | Hva betyr FERDIGDATO når UTREDRES mangler (fire rader) eller andre felt motsier den?                      | Fagansvarlig / Access-forvalter                                    | Prioritet mellom felter og regler for «må avklares»                            |
| 1         | Hva betyr Stilt i bero, Henleggelse påklaget og arbeidsgiveranmeldelse for oppfølging?                    | Fagansvarlig SV, bruk krysstabellen med politidatoer               | Eksplisitt mapping per kode; dato alene avgjør ikke status                     |
| 2         | Er én kandidat en PID, SID eller kildepost? Skal utredning og SV bli én eller flere Watson-saker?         | Domeneekspert + DBA; bekreft referanser, ikke bare numeriske treff | Kandidatnøkkel, kildeangivelse, kardinalitet og trygg sammenslåingsregel       |
| 2         | Hva er faktisk TIPSREF-kobling, og hvorfor deler enkelte FNR-verdier tusenvis av PID-er?                  | DBA / kildeforvalter; avklar anonymisering og ID-serier            | Dokumentert relasjon og datakvalitetsregler; ikke bruk FNR som saksnøkkel      |
| 2         | Hvem bekrefter saksbehandleransvar, og hvem får se saker uten bekreftet ansvar?                           | Fag-/tilgangsansvarlig; avklar Bjørns manuelle opprydding          | Autoritativ eierkilde og tilgangsmatrise, inkludert enhet/skjerming            |
| 3         | Hvilken motor, database og hvilket skjema flyttes kildedata til?                                          | DBA / plattformansvarlig                                           | DDL-dialekt, read-only-tilgang, oppdaterings-/frysetidspunkt og tilkobling     |
| 3         | Hvilken dato skal vises, og hva betyr den?                                                                | Fagansvarlig + kildeforvalter                                      | Datofelt, etikett og nullhåndtering; ikke bland tipsdato og påbegynt ukritisk  |
| 3         | Hvilke data følger med ved opprettelse, og hva regnes som ferdig migrert?                                 | Produkteier / fagansvarlig                                         | Feltmapping, vedlegg/notat, ansvar/enhet, historikk og avklart kvitteringskrav |

Ingen fødselsnumre, navn eller saksinnhold fra reelle saker skal inn i chat,
mockdata eller dokumentasjon. Del bare aggregater og faglig tolkning.

## Teknisk arbeid før ekte data

1. Godkjenn beslutningstabell for aktiv / avsluttet / må avklares, med
   syntetiske testtilfeller for nullfelt og motstridende kombinasjoner.
2. Lag nytt view og API på bekreftet målplattform. Bevar kildetype og original
   nøkkel. Ukjent kombinasjon skal ikke stilletiende utelates.
3. Håndhev tilgang og NAV-ident-filter i backend før data leveres til klienten;
   mockloaderens lister er ikke en produksjonsimplementasjon av autorisasjon.
   Avklar navn/personoppslag, paginering, revisjonslogging og skjerming.
4. Avklar legacy-nøkkelkontrakten: DB krever fem sifre og unik `legacy_pid`,
   mens Figma/mock har seks. API-requesten mangler `legacyPid`. Ikke endre
   constraint eller slå sammen kildenøkler uten kildeverifisering.
5. Bygg autorisert kandidatuthenting og valider opprettelsen server-side.
   Ikke stol på skjulte klientfelter for person, eier eller kildeidentitet.
   Avklar duplikathåndtering og samtidighet; «finn før opprett» alene er ikke nok.
6. Koble eksisterende opprettelsesskjema og test feltmapping, notat/vedlegg,
   kildehistorikk, avbrudd og gjentatte innsendinger før opprettelsesknappen åpnes.
7. Skill AI-chatbot-commiten `f0fbdc3` fra migrerings-PR-en. Denne prototypen
   bygger foreløpig på samme lokale branchhistorikk; ingen push/deploy er gjort.

## Prøve prototypen

```bash
ENVIRONMENT=local-mock pnpm run dev
```

Åpne `http://localhost:5174/migrering`. Prøv vurderingsfilteret, «Se grunnlag»
på ferdigdato-/bero-eksemplene, og fanen for ubekreftet ansvar. Eksemplene
følger valgt lokal brukerprofil, ikke en hardkodet innlogget NAV-ident.

## Tester

`pnpm run verify` må være grønn. Migreringstestene dekker miljøsperre,
serverinndeling av mocklister, ignorerte NAV-ident-queryparametre, ingen
promotering av søkelogg til eierskap, kilde/PID-skille, søk, vurderingsfilter,
grunnlagsdialog, sperret opprettelse og skille mellom research- og mockantall.
De verifiserer ikke forretningsregler eller integrasjon mot faktisk DB.
