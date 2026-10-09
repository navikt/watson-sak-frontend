import { data } from "react-router";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { redigerSaksinformasjonSchema } from "~/registrer-sak/validering";
import { bygFeilkartFraIssues, parseYtelseRader } from "~/registrer-sak/skjema-helpers";
import { hentAlleSaker, medInnloggetEier } from "~/saker/mock-alle-saker.server";
import { mockSaksbehandlerDetaljer } from "~/saker/mock-saksbehandlere.server";
import type {
  KontrollsakResponse,
  KontrollsakSteg,
  KontrollsakStatus,
} from "~/saker/types.backend";
import { hentTekstfelt, hentValgfriTekst } from "~/utils/form-data";
import { hentDokumenttreForSak } from "../filer/mock-data.server";
import { leggTilJournalpost } from "~/testing/mock-store/journalposter.server";
import { arkiverFil, opprettArkivertFilFraDokument } from "../filer/mock-data-filer.server";
import { arkiverDokument } from "~/testing/mock-store/dokumenter.server";
import { hentMockState } from "~/testing/mock-store/session.server";
import { byggLagreResultatRequest, validerResultatFeltNavn } from "../handlinger/resultat-request";
import { erAktivSakKontrollsak } from "../handlinger/tilgjengeligeHandlinger";
import {
  erGyldigMockStegovergang,
  hentMockTillatteHandlinger,
} from "../mock-tillatte-handlinger.server";
import {
  harLagretResultatForOvergang,
  hentVisbareSteg,
  manglerEndeligUtfallVedAvslutning,
} from "../handlinger/tillatte-steg";
import {
  leggTilHendelse,
  leggTilManuellHendelse,
  redigerManuellHendelse,
  slettManuellHendelse,
} from "../historikk/mock-data.server";
import { finnSakMedReferanse } from "../id";
import { getSaksenhet } from "../selectors";
import { hentStegbaserteSaksregler } from "../stegregler";
import type { RedigerSaksinformasjonData } from "../komponenter/Saksinformasjon.types";
import {
  type ActionResult,
  beskrivEndredeFelter,
  byggResultatForLagring,
  erKoblingshandling,
  erSaksbehandlerPåSak,
  erTildelingshandling,
  finnEndredeSaksinformasjonsfelter,
  finnNotatMalLabel,
  finnSaksbehandlerDetalj,
  getHendelsestypeForStatusendring,
  getHendelsestypeForStegendring,
  handlingerSomKreverUtredning,
  krevEierEllerLeder,
  krevTillattHandling,
  lagTidspunktFraSkjema,
  lagreMockResultat,
  normaliserArbeidsgiverFeil,
  parseStatusFraDialog,
  sjekkEierEllerLeder,
} from "~/saker/SakDetaljSide.felles.server";

export async function mockAction(
  request: Request,
  sakId: string,
  handling: string,
  formData: FormData,
): Promise<ActionResult> {
  const sak = finnSakMedReferanse(hentAlleSaker(request), sakId);
  if (!sak) {
    throw data("Sak ikke funnet", { status: 404 });
  }

  if (!erTildelingshandling(handling) && !erKoblingshandling(handling)) {
    const innlogget = await hentInnloggetBruker({ request });
    const sakMedEier = medInnloggetEier(sak, innlogget.navIdent, innlogget.name);
    if (sakMedEier.saksbehandlere.eier?.navIdent !== innlogget.navIdent) {
      throw data("Du må være tildelt saken for å utføre denne handlingen", { status: 403 });
    }
  }

  if (krevEierEllerLeder(handling)) {
    const innlogget = await hentInnloggetBruker({ request });
    sjekkEierEllerLeder(handling, sak, innlogget);
  }

  if (
    sak.steg === "AVSLUTTET" &&
    (handling === "endre_steg" || handling === "endre_steg_dialog" || handling === "endre_status")
  ) {
    throw data("Kan ikke endre avsluttet sak", { status: 400 });
  }

  const saksbehandlere = sak.saksbehandlere;
  const tillatte = hentMockTillatteHandlinger(sak);
  const innloggetBruker = await hentInnloggetBruker({ request });
  const leggTilBrukerhendelse = (
    hendelseSak: KontrollsakResponse,
    type: Parameters<typeof leggTilHendelse>[2],
    tidspunkt?: string,
    metadata?: Parameters<typeof leggTilHendelse>[4],
  ) =>
    leggTilHendelse(request, hendelseSak, type, tidspunkt, {
      opprettetAvNavn: innloggetBruker.name,
      ...metadata,
    });

  if (
    !hentStegbaserteSaksregler(sak.steg).kanUtføreUtredningsarbeid &&
    handlingerSomKreverUtredning.has(handling)
  ) {
    throw data("Handlingen krever at saken har steg Utredning", { status: 400 });
  }

  switch (handling) {
    case "TILDEL_MEG": {
      if (sak.saksbehandlere.eier) {
        throw data("Saken har allerede en saksbehandler", { status: 409 });
      }
      const valgtSaksbehandler = finnSaksbehandlerDetalj(
        mockSaksbehandlerDetaljer,
        innloggetBruker.navIdent,
      ) ?? {
        navIdent: innloggetBruker.navIdent,
        navn: innloggetBruker.name,
        enhet: innloggetBruker.enhet,
      };
      sak.saksbehandlere.eier = valgtSaksbehandler;
      leggTilBrukerhendelse(sak, "SAK_TILDELT");
      break;
    }
    case "TILDEL": {
      const navIdent = hentTekstfelt(formData, "navIdent", "Ugyldig saksbehandler");
      const navn = hentValgfriTekst(formData, "navn") ?? navIdent;
      const valgtSaksbehandler = finnSaksbehandlerDetalj(mockSaksbehandlerDetaljer, navIdent) ?? {
        navIdent,
        navn,
        enhet: null,
      };

      sak.saksbehandlere.eier = valgtSaksbehandler;
      leggTilBrukerhendelse(sak, "SAK_TILDELT");
      break;
    }
    case "FRISTILL": {
      sak.saksbehandlere.eier = null;
      break;
    }
    case "endre_steg":
    case "endre_steg_dialog": {
      const nyttSteg = hentTekstfelt(formData, "steg", "Ugyldig steg");
      krevTillattHandling(tillatte, "FLYTT_TIL_NESTE_STEG");
      if (!hentVisbareSteg(tillatte).includes(nyttSteg as KontrollsakSteg)) {
        throw data("Steget er ikke tillatt for saken i gjeldende tilstand", { status: 409 });
      }
      try {
        validerResultatFeltNavn(formData, tillatte.feltskjema, tillatte.tilstand.ytelser);
      } catch (feil) {
        throw data(feil instanceof Error ? feil.message : "Ugyldige skjemafelter", {
          status: 400,
        });
      }
      const beskrivelse = hentValgfriTekst(formData, "beskrivelse");
      const forrigeStatus = sak.status;
      const registrerResultat = formData.get("registrerResultat") === "true";
      if (
        !harLagretResultatForOvergang(tillatte, nyttSteg as KontrollsakSteg) &&
        !registrerResultat
      ) {
        throw data("Registrer resultat før saken flyttes til neste steg", { status: 400 });
      }
      const kandidat = { ...sak };
      try {
        const resultat = byggLagreResultatRequest(
          formData,
          tillatte.feltskjema,
          tillatte.tilstand.steg,
          undefined,
          tillatte.tilstand.ytelser,
          registrerResultat,
        );
        if (registrerResultat && !resultat) throw new Error("Velg et resultat før du fortsetter");
        if (resultat?.paaklaget) throw new Error("En påklaget henleggelse lagres uten stegbytte");
        if (
          manglerEndeligUtfallVedAvslutning(
            tillatte.tilstand,
            nyttSteg as KontrollsakSteg,
            resultat,
          )
        ) {
          throw new Error("Velg endelig resultat før du flytter saken til Avsluttet");
        }
        if (resultat) {
          lagreMockResultat(kandidat, resultat);
          if (kandidat.status === "PAAKLAGET" && resultat.politi) {
            kandidat.status = "VENTER_PA_RESULTAT";
          }
        }
      } catch (feil) {
        throw data(feil instanceof Error ? feil.message : "Ugyldige resultatfelter", {
          status: 400,
        });
      }

      if (!erGyldigMockStegovergang(kandidat, nyttSteg as KontrollsakSteg)) {
        throw data("Stegbyttet er ikke gyldig for registrert resultat", { status: 409 });
      }
      sak.resultat = kandidat.resultat;
      sak.ytelser = kandidat.ytelser;
      sak.steg = nyttSteg as KontrollsakSteg;
      sak.status = (
        {
          OPPRETTET: null,
          UTREDNING: "AKTIV",
          UTREDES: "AKTIV",
          FORVALTNING: "VENTER_PA_VEDTAK",
          STRAFFERETTSLIG_VURDERING: "AKTIV",
          POLITI: "VENTER_PA_RESULTAT",
          ANMELDT: "VENTER_PA_RESULTAT",
          AVSLUTTET: null,
        } satisfies Record<KontrollsakSteg, KontrollsakStatus | null>
      )[nyttSteg as KontrollsakSteg];
      leggTilBrukerhendelse(sak, getHendelsestypeForStegendring(sak.steg), undefined, {
        beskrivelse,
        status: nyttSteg === "AVSLUTTET" ? forrigeStatus : sak.status,
      });
      break;
    }
    case "lagre_resultat": {
      krevTillattHandling(tillatte, "REGISTRER_RESULTAT");
      lagreMockResultat(sak, byggResultatForLagring(formData, tillatte));
      break;
    }
    case "endre_status": {
      krevTillattHandling(tillatte, "ENDRE_STATUS");
      const status = parseStatusFraDialog(hentValgfriTekst(formData, "status"));
      if (!tillatte.tillatteStatuser.includes(status)) {
        throw data("Statusen er ikke tillatt for saken i gjeldende tilstand", { status: 409 });
      }
      validerResultatFeltNavn(formData, tillatte.feltskjema);
      const beskrivelse = hentValgfriTekst(formData, "beskrivelse");

      const varIBero = sak.status === "I_BERO";
      if (status === "I_BERO") sak.statusFørBero = sak.status;
      if (varIBero) sak.statusFørBero = null;
      sak.status = status;
      leggTilBrukerhendelse(
        sak,
        varIBero || status === null ? "SAK_GJENOPPTATT" : getHendelsestypeForStatusendring(status),
        undefined,
        { beskrivelse },
      );
      break;
    }
    case "overfor_ansvarlig": {
      const navIdent = hentTekstfelt(formData, "navIdent", "Ugyldig saksbehandler");
      const valgtSaksbehandler = finnSaksbehandlerDetalj(mockSaksbehandlerDetaljer, navIdent);

      if (!valgtSaksbehandler) {
        throw data("Ugyldig saksbehandler", { status: 400 });
      }

      const berortSaksbehandlerEnhet =
        valgtSaksbehandler.enhet === null ? undefined : valgtSaksbehandler.enhet;

      sak.saksbehandlere.eier = valgtSaksbehandler;
      sak.saksbehandlere.deltMed = sak.saksbehandlere.deltMed.filter(
        (saksbehandler) => saksbehandler.navIdent !== valgtSaksbehandler.navIdent,
      );

      leggTilBrukerhendelse(sak, "ANSVARLIG_SAKSBEHANDLER_ENDRET", undefined, {
        berortSaksbehandlerNavn: valgtSaksbehandler.navn,
        berortSaksbehandlerNavIdent: valgtSaksbehandler.navIdent,
        berortSaksbehandlerEnhet,
      });
      break;
    }
    case "videresend_seksjon": {
      const nySeksjon = hentTekstfelt(formData, "seksjon", "Ugyldig seksjon");

      if (sak.saksbehandlere.eier) {
        sak.saksbehandlere.eier = {
          ...sak.saksbehandlere.eier,
          enhet: nySeksjon,
        };
      } else {
        sak.saksbehandlere.opprettetAv = {
          ...sak.saksbehandlere.opprettetAv,
          enhet: nySeksjon,
        };
      }
      leggTilBrukerhendelse(sak, "MOTTAKSENHET_ENDRET");
      break;
    }
    case "send_til_annen_enhet": {
      const nySeksjon = hentTekstfelt(formData, "seksjon", "Ugyldig enhet");

      if (nySeksjon === getSaksenhet(sak)) {
        throw data("Velg en annen enhet", { status: 400 });
      }

      sak.saksbehandlere.opprettetAv = {
        ...sak.saksbehandlere.opprettetAv,
        enhet: nySeksjon,
      };
      sak.saksbehandlere.eier = null;
      leggTilBrukerhendelse(sak, "MOTTAKSENHET_ENDRET");
      break;
    }
    case "rediger_saksinformasjon": {
      if (!erAktivSakKontrollsak(sak.steg)) {
        return {
          ok: false,
          feil: { skjema: ["Saken kan ikke redigeres i dette steget."] },
        } satisfies ActionResult;
      }

      const ytelseRader = parseYtelseRader(formData);
      const rådata = {
        kategori: formData.get("kategori") ?? undefined,
        kilde: formData.get("kilde") ?? undefined,
        misbruktype: formData
          .getAll("misbruktype")
          .filter((v): v is string => typeof v === "string" && v.length > 0),
        merking: formData
          .getAll("merking")
          .filter((v): v is string => typeof v === "string" && v.length > 0),
        arbeidsgivere: formData
          .getAll("arbeidsgivere")
          .filter((v): v is string => typeof v === "string" && v.length > 0),
        ytelser: ytelseRader,
      };

      const verdier: RedigerSaksinformasjonData = {
        kategori: typeof rådata.kategori === "string" ? rådata.kategori : "",
        kilde: typeof rådata.kilde === "string" ? rådata.kilde : "",
        misbruktype: rådata.misbruktype,
        merking: rådata.merking,
        arbeidsgivere: rådata.arbeidsgivere,
        ytelser: ytelseRader.length > 0 ? ytelseRader : [{}],
      };

      const resultat = redigerSaksinformasjonSchema.safeParse(rådata);

      if (!resultat.success) {
        return {
          ok: false,
          feil: normaliserArbeidsgiverFeil(bygFeilkartFraIssues(resultat.error.issues)),
          verdier,
        } satisfies ActionResult;
      }

      const validert = resultat.data;
      const nyeYtelser = validert.ytelser.map((ytelse) => ({
        type: ytelse.type ?? "",
        periodeFra: ytelse.fraDato ?? "",
        periodeTil: ytelse.tilDato ?? "",
        belop: ytelse.beløp ?? null,
        endeligBelop: ytelse.endeligBeløp ?? null,
      }));
      const endredeFelter = finnEndredeSaksinformasjonsfelter(sak, validert, nyeYtelser);

      sak.kategori = validert.kategori;
      sak.misbruktype = [...validert.misbruktype];
      sak.merking = [...validert.merking];
      sak.kilde = validert.kilde;
      sak.arbeidsgivere = [...validert.arbeidsgivere];
      sak.ytelser = nyeYtelser;
      leggTilBrukerhendelse(sak, "SAKSINFORMASJON_ENDRET", undefined, {
        beskrivelse: beskrivEndredeFelter(endredeFelter),
      });
      return { ok: true, sak } satisfies ActionResult;
    }
    case "koble_sak":
    case "fjern_kobling": {
      const kobletSakIdRaw = formData.get("relatertSakId");
      const kobletSakId = Number(kobletSakIdRaw);
      if (!Number.isSafeInteger(kobletSakId) || kobletSakId <= 0) {
        return {
          ok: false,
          feil: { skjema: ["Ugyldig sak-ID"] },
        } satisfies ActionResult;
      }

      const kobletSak = hentAlleSaker(request).find((annenSak) => annenSak.id === kobletSakId);
      if (
        !kobletSak ||
        kobletSak.id === sak.id ||
        (handling === "koble_sak" && kobletSak.personIdent !== sak.personIdent)
      ) {
        return {
          ok: false,
          feil: { skjema: ["Kan ikke endre kobling til denne saken"] },
        } satisfies ActionResult;
      }
      const innlogget = await hentInnloggetBruker({ request });
      if (
        !erSaksbehandlerPåSak(sak, innlogget.navIdent) &&
        !erSaksbehandlerPåSak(kobletSak, innlogget.navIdent)
      ) {
        throw data("Du må være saksbehandler på minst én av sakene for å endre koblingen", {
          status: 403,
        });
      }

      const erKoblet = sak.kobledeSaker.includes(kobletSak.id);
      if (handling === "koble_sak") {
        if (erKoblet) {
          return {
            ok: false,
            feil: { skjema: ["Sakene er allerede koblet"] },
          } satisfies ActionResult;
        }
        sak.kobledeSaker.push(kobletSak.id);
        kobletSak.kobledeSaker.push(sak.id);
      } else {
        if (!erKoblet) {
          return {
            ok: false,
            feil: { skjema: ["Sakene er ikke koblet"] },
          } satisfies ActionResult;
        }
        sak.kobledeSaker = sak.kobledeSaker.filter((id) => id !== kobletSak.id);
        kobletSak.kobledeSaker = kobletSak.kobledeSaker.filter((id) => id !== sak.id);
      }

      return { ok: true } satisfies ActionResult;
    }
    case "del_tilgang": {
      const navIdent = hentTekstfelt(formData, "navIdent", "Ugyldig saksbehandler");
      const valgtSaksbehandler = finnSaksbehandlerDetalj(mockSaksbehandlerDetaljer, navIdent);

      if (!valgtSaksbehandler) {
        throw data("Ugyldig saksbehandler", { status: 400 });
      }

      const berortSaksbehandlerEnhet =
        valgtSaksbehandler.enhet === null ? undefined : valgtSaksbehandler.enhet;

      const erAnsvarlig = sak.saksbehandlere.eier?.navIdent === valgtSaksbehandler.navIdent;
      const erAlleredeDelt = saksbehandlere.deltMed.some(
        (saksbehandler) => saksbehandler.navIdent === valgtSaksbehandler.navIdent,
      );

      if (!erAnsvarlig && !erAlleredeDelt) {
        saksbehandlere.deltMed.push(valgtSaksbehandler);
        leggTilBrukerhendelse(sak, "TILGANG_DELT", undefined, {
          berortSaksbehandlerNavn: valgtSaksbehandler.navn,
          berortSaksbehandlerNavIdent: valgtSaksbehandler.navIdent,
          berortSaksbehandlerEnhet,
        });
      }

      break;
    }
    case "fjern_delt_tilgang": {
      const navIdent = hentTekstfelt(formData, "navIdent", "Ugyldig saksbehandler");
      const saksbehandler = saksbehandlere.deltMed.find(
        (deltSaksbehandler) => deltSaksbehandler.navIdent === navIdent,
      );

      saksbehandlere.deltMed = saksbehandlere.deltMed.filter(
        (deltSaksbehandler) => deltSaksbehandler.navIdent !== navIdent,
      );

      if (saksbehandler) {
        const berortSaksbehandlerEnhet =
          saksbehandler.enhet === null ? undefined : saksbehandler.enhet;

        leggTilBrukerhendelse(sak, "TILGANG_FJERNET", undefined, {
          berortSaksbehandlerNavn: saksbehandler.navn,
          berortSaksbehandlerNavIdent: saksbehandler.navIdent,
          berortSaksbehandlerEnhet,
        });
      }

      break;
    }
    case "legg_til_historikk": {
      const tittel = hentTekstfelt(formData, "tittel", "Tittel er påkrevd");
      const notat = hentValgfriTekst(formData, "notat") ?? "";
      const dato = hentTekstfelt(formData, "dato", "Dato er påkrevd");
      const tid = hentTekstfelt(formData, "tid", "Tid er påkrevd");

      const tidspunkt = lagTidspunktFraSkjema(dato, tid);
      leggTilManuellHendelse(request, sak, tittel, notat, tidspunkt, innloggetBruker.name);
      break;
    }
    case "rediger_historikk": {
      const hendelseId = hentTekstfelt(formData, "hendelseId", "Hendelse-ID er påkrevd");
      const tittel = hentTekstfelt(formData, "tittel", "Tittel er påkrevd");
      const notat = hentValgfriTekst(formData, "notat") ?? "";
      const dato = hentTekstfelt(formData, "dato", "Dato er påkrevd");
      const tid = hentTekstfelt(formData, "tid", "Tid er påkrevd");

      const tidspunkt = lagTidspunktFraSkjema(dato, tid);
      redigerManuellHendelse(request, String(sak.id), hendelseId, tittel, notat, tidspunkt);
      break;
    }
    case "slett_historikk": {
      const hendelseId = hentTekstfelt(formData, "hendelseId", "Hendelse-ID er påkrevd");
      slettManuellHendelse(request, String(sak.id), hendelseId);
      break;
    }
    case "send_notat": {
      const notatRaw = formData.get("notat");
      if (typeof notatRaw !== "string" || !notatRaw.trim()) {
        throw data("Notat er påkrevd", { status: 400 });
      }
      const notat = notatRaw.trim();
      const malLabel = finnNotatMalLabel(formData.get("mal"));
      const knyttTilOppgave = formData.get("knyttTilOppgave") === "true";
      const oppgavetype = hentValgfriTekst(formData, "oppgavetype") ?? "";

      const deler = [notat];
      if (malLabel) {
        deler.push(`Mal: ${malLabel}`);
      }
      if (knyttTilOppgave) {
        deler.push(`Knyttet til oppgave${oppgavetype ? `: ${oppgavetype}` : ""}`);
      }

      leggTilJournalpost(hentMockState(request), String(sak.id), {
        journalpostId: `demo-${crypto.randomUUID()}`,
        journalposttype: "NOTAT",
        tittel: malLabel ?? "Notat",
        opprettet: new Date().toISOString(),
      });
      leggTilBrukerhendelse(sak, "NOTAT_SENDT", undefined, {
        beskrivelse: deler.join("\n"),
      });
      break;
    }
    case "opprett_journalpost": {
      const journalposttype = hentValgfriTekst(formData, "journalposttype") ?? "NOTAT";
      const jpTittel = hentValgfriTekst(formData, "tittel") ?? "Journalpost";
      const dokumentIds = formData.getAll("dokumentId").map(String);
      const vedleggIdsForArkivering = formData.getAll("vedleggId").map(String);
      const knyttTilOppgave = formData.get("knyttTilOppgave") === "true";
      const { navIdent } = innloggetBruker;
      const journalpostId = `demo-${crypto.randomUUID()}`;

      const antallArkiverteVedlegg = vedleggIdsForArkivering.filter(
        (filId) => arkiverFil(request, sakId, filId, navIdent, journalpostId) !== null,
      ).length;

      const dokumenttre = hentDokumenttreForSak(request, sakId);
      let antallArkiverteDokumenter = 0;
      for (const dokumentId of dokumentIds) {
        const dokument = dokumenttre.find((node) => node.id === dokumentId);
        if (!dokument || dokument.arkivert) continue;
        if (!arkiverDokument(hentMockState(request), sakId, dokumentId, navIdent, journalpostId)) {
          continue;
        }
        opprettArkivertFilFraDokument(request, sakId, dokument, navIdent, journalpostId);
        antallArkiverteDokumenter += 1;
      }

      leggTilJournalpost(hentMockState(request), sakId, {
        journalpostId,
        journalposttype,
        tittel: jpTittel,
        opprettet: new Date().toISOString(),
      });

      leggTilBrukerhendelse(sak, "JOURNALPOST_OPPRETTET", undefined, {
        tittel: journalposttype,
        beskrivelse: "Journalpost opprettet",
      });

      for (let i = 0; i < antallArkiverteVedlegg; i += 1) {
        leggTilHendelse(request, sak, "FIL_ARKIVERT", undefined, {
          beskrivelse: "Vedlegg arkivert i journalpost",
        });
      }
      for (let i = 0; i < antallArkiverteDokumenter; i += 1) {
        leggTilHendelse(request, sak, "FIL_ARKIVERT", undefined, {
          beskrivelse: "Dokument arkivert i journalpost",
        });
      }

      if (knyttTilOppgave) {
        const oppgavetype = hentValgfriTekst(formData, "oppgavetype") ?? "";
        leggTilBrukerhendelse(sak, "OPPGAVE_OPPRETTET", undefined, {
          tittel: oppgavetype || "Oppgave",
          beskrivelse: "Oppgave opprettet",
        });
      }

      break;
    }
    case "opprett_oppgave": {
      const oppgavetype = hentValgfriTekst(formData, "oppgavetype") ?? "";
      leggTilBrukerhendelse(sak, "OPPGAVE_OPPRETTET", undefined, {
        tittel: oppgavetype || "Oppgave",
        beskrivelse: "Oppgave opprettet",
      });
      break;
    }
    default: {
      throw data("Ugyldig handling", { status: 400 });
    }
  }

  sak.oppdatert = new Date().toISOString();

  return { ok: true } satisfies ActionResult;
}
