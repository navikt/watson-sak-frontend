import { data } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { env } from "~/config/env.server";
import { ferdigstillMigreringskandidat } from "~/migrering/api.server";
import { redigerSaksinformasjonSchema } from "~/registrer-sak/validering";
import { bygFeilkartFraIssues, parseYtelseRader } from "~/registrer-sak/skjema-helpers";
import * as backendApi from "~/saker/api.server";
import type { KontrollsakSteg, LagreResultatRequest } from "~/saker/types.backend";
import { hentTekstfelt, hentValgfriTekst } from "~/utils/form-data";
import { migreringErÅpen } from "~/migrering/miljo";
import { byggLagreResultatRequest, validerResultatFeltNavn } from "../handlinger/resultat-request";
import {
  harLagretResultatForOvergang,
  hentVisbareSteg,
  manglerEndeligUtfallVedAvslutning,
} from "../handlinger/tillatte-steg";
import { hentStegbaserteSaksregler } from "../stegregler";
import type { Route } from "../+types/SakDetaljSide.route";
import {
  type ActionResult,
  byggResultatForLagring,
  erKoblingshandling,
  erSaksbehandlerPåSak,
  erTildelingshandling,
  finnNotatMalLabel,
  handlingerSomKreverUtredning,
  historikkFeilmelding,
  koblingsFeilmelding,
  krevEierEllerLeder,
  krevTillattHandling,
  lagTidspunktFraSkjema,
  normaliserArbeidsgiverFeil,
  parseStatusFraDialog,
  sjekkEierEllerLeder,
} from "~/saker/SakDetaljSide.felles.server";

// --- Backend-action (ekte API-kall) ---

export async function backendAction(
  request: Request,
  sakId: string,
  handling: string,
  formData: FormData,
): Promise<ActionResult> {
  const token = await getBackendOboToken(request);
  let sakFraTilgangskontroll: Route.ComponentProps["loaderData"]["sak"] | undefined;

  if (!erTildelingshandling(handling) && !erKoblingshandling(handling)) {
    const innlogget = await hentInnloggetBruker({ request });
    const nåværendeSak = await backendApi.hentKontrollsak(token, sakId);
    if (nåværendeSak.saksbehandlere.eier?.navIdent !== innlogget.navIdent) {
      throw data("Du må være tildelt saken for å utføre denne handlingen", { status: 403 });
    }
    sakFraTilgangskontroll = nåværendeSak;
  }

  if (handling === "MIGRERING_FERDIGSTILL") {
    if (!migreringErÅpen(env.ENVIRONMENT)) {
      throw data("Ferdigmerking er ikke tilgjengelig", { status: 404 });
    }
    if (formData.get("bekreftet") !== "ja") {
      throw data("Du må bekrefte at innholdet er overført", { status: 400 });
    }
    const sak = sakFraTilgangskontroll;
    if (!sak?.legacyKilde || !sak.legacyPid) {
      throw data("Saken mangler migreringsnøkkel", { status: 400 });
    }
    await ferdigstillMigreringskandidat(request, `${sak.legacyKilde}:${sak.legacyPid}`);
    return { ok: true };
  }

  if (
    sakFraTilgangskontroll &&
    !hentStegbaserteSaksregler(sakFraTilgangskontroll.steg).kanUtføreUtredningsarbeid &&
    handlingerSomKreverUtredning.has(handling)
  ) {
    throw data("Handlingen krever at saken har steg Utredning", { status: 400 });
  }

  if (krevEierEllerLeder(handling)) {
    const innlogget = await hentInnloggetBruker({ request });
    const nåværendeSak = sakFraTilgangskontroll ?? (await backendApi.hentKontrollsak(token, sakId));
    sjekkEierEllerLeder(handling, nåværendeSak, innlogget);
  }

  switch (handling) {
    case "TILDEL_MEG": {
      const innlogget = await hentInnloggetBruker({ request });
      const sak = await backendApi.tildelKontrollsak(token, sakId, innlogget.navIdent);
      return { ok: true, sak };
    }
    case "TILDEL": {
      const navIdent = hentTekstfelt(formData, "navIdent", "Ugyldig saksbehandler");
      const sak = await backendApi.tildelKontrollsak(token, sakId, navIdent);
      return { ok: true, sak };
    }
    case "FRISTILL": {
      const sak = await backendApi.fristillKontrollsak(token, sakId);
      return { ok: true, sak };
    }
    case "endre_steg":
    case "endre_steg_dialog": {
      const nyttSteg = hentTekstfelt(formData, "steg", "Ugyldig steg");
      const beskrivelse = hentValgfriTekst(formData, "beskrivelse");
      const tillatte = await backendApi.hentTillatteHandlinger(token, sakId);
      krevTillattHandling(tillatte, "FLYTT_TIL_NESTE_STEG");
      try {
        validerResultatFeltNavn(formData, tillatte.feltskjema, tillatte.tilstand.ytelser);
      } catch (feil) {
        throw data(feil instanceof Error ? feil.message : "Ugyldige skjemafelter", {
          status: 400,
        });
      }
      if (!hentVisbareSteg(tillatte).includes(nyttSteg as KontrollsakSteg)) {
        throw data("Steget er ikke tillatt for saken i gjeldende tilstand", { status: 409 });
      }

      let resultat: LagreResultatRequest | undefined;
      const registrerResultat = formData.get("registrerResultat") === "true";
      if (
        !harLagretResultatForOvergang(tillatte, nyttSteg as KontrollsakSteg) &&
        !registrerResultat
      ) {
        throw data("Registrer resultat før saken flyttes til neste steg", { status: 400 });
      }
      try {
        resultat = byggLagreResultatRequest(
          formData,
          tillatte.feltskjema,
          tillatte.tilstand.steg,
          undefined,
          tillatte.tilstand.ytelser,
          registrerResultat,
        );
      } catch (feil) {
        throw data(feil instanceof Error ? feil.message : "Ugyldige resultatfelter", {
          status: 400,
        });
      }
      if (registrerResultat && !resultat) {
        throw data("Velg et resultat før du fortsetter", { status: 400 });
      }
      if (resultat?.paaklaget) {
        throw data("En påklaget henleggelse lagres uten stegbytte", { status: 400 });
      }
      if (
        manglerEndeligUtfallVedAvslutning(tillatte.tilstand, nyttSteg as KontrollsakSteg, resultat)
      ) {
        throw data("Velg endelig resultat før du flytter saken til Avsluttet", { status: 400 });
      }
      const sak = await backendApi.endreSteg(
        token,
        sakId,
        tillatte.versjon,
        nyttSteg as KontrollsakSteg,
        resultat,
        beskrivelse ?? undefined,
      );
      return { ok: true, sak };
    }
    case "lagre_resultat": {
      const tillatte = await backendApi.hentTillatteHandlinger(token, sakId);
      krevTillattHandling(tillatte, "REGISTRER_RESULTAT");
      const resultat = byggResultatForLagring(formData, tillatte);
      const sak = await backendApi.lagreResultat(token, sakId, resultat);
      return { ok: true, sak };
    }
    case "endre_status": {
      const tillatte = await backendApi.hentTillatteHandlinger(token, sakId);
      krevTillattHandling(tillatte, "ENDRE_STATUS");
      try {
        validerResultatFeltNavn(formData, tillatte.feltskjema);
      } catch (feil) {
        throw data(feil instanceof Error ? feil.message : "Ugyldige skjemafelter", {
          status: 400,
        });
      }
      const status = parseStatusFraDialog(hentValgfriTekst(formData, "status"));
      if (!tillatte.tillatteStatuser.includes(status)) {
        throw data("Statusen er ikke tillatt for saken i gjeldende tilstand", { status: 409 });
      }
      const beskrivelse = hentValgfriTekst(formData, "beskrivelse");
      const sak = await backendApi.endreStatus(token, sakId, status, beskrivelse ?? undefined);
      return { ok: true, sak };
    }
    case "del_tilgang": {
      const navIdent = hentTekstfelt(formData, "navIdent", "Ugyldig saksbehandler");
      const sak = await backendApi.delKontrollsak(token, sakId, navIdent);
      return { ok: true, sak };
    }
    case "send_notat": {
      const notatRaw = formData.get("notat");
      if (typeof notatRaw !== "string" || !notatRaw.trim()) {
        throw data("Notat er påkrevd", { status: 400 });
      }
      const malLabel = finnNotatMalLabel(formData.get("mal"));
      const tittel = malLabel ?? "Notat";
      await backendApi.opprettJournalpost(token, sakId, "NOTAT", tittel, notatRaw.trim());
      return { ok: true };
    }
    case "opprett_journalpost": {
      const journalposttype = hentTekstfelt(
        formData,
        "journalposttype",
        "Journalposttype er påkrevd",
      );
      const tittel = hentTekstfelt(formData, "tittel", "Tittel er påkrevd");
      const innhold = hentTekstfelt(formData, "innhold", "Innhold er påkrevd");
      const vedleggIds = formData.getAll("vedleggId").map(String);
      const dokumentIds = formData.getAll("dokumentId").map(String);
      const knyttTilOppgave = formData.get("knyttTilOppgave") === "true";

      const journalpostRespons = await backendApi.opprettJournalpost(
        token,
        sakId,
        journalposttype,
        tittel.trim(),
        innhold.trim(),
        vedleggIds,
        dokumentIds,
      );

      if (knyttTilOppgave) {
        const tildeltEnhetsnr = hentTekstfelt(
          formData,
          "behandlendeEnhet",
          "Behandlende enhet er påkrevd",
        );
        const prioritet = hentTekstfelt(formData, "prioritet", "Prioritet er påkrevd");
        const fristDato = hentTekstfelt(formData, "frist", "Frist er påkrevd");
        const beskrivelse = hentTekstfelt(formData, "beskrivelse", "Beskrivelse er påkrevd");
        const oppgavetype = hentTekstfelt(formData, "oppgavetype", "Oppgavetype er påkrevd");
        await backendApi.opprettOppgave(
          token,
          sakId,
          tildeltEnhetsnr,
          prioritet,
          fristDato,
          beskrivelse,
          oppgavetype,
          journalpostRespons.journalpostId,
        );
      }

      return { ok: true };
    }
    case "opprett_oppgave": {
      const tildeltEnhetsnr = hentTekstfelt(
        formData,
        "behandlendeEnhet",
        "Behandlende enhet er påkrevd",
      );
      const prioritet = hentTekstfelt(formData, "prioritet", "Prioritet er påkrevd");
      const fristDato = hentTekstfelt(formData, "frist", "Frist er påkrevd");
      const beskrivelse = hentTekstfelt(formData, "beskrivelse", "Beskrivelse er påkrevd");
      const oppgavetype = hentTekstfelt(formData, "oppgavetype", "Oppgavetype er påkrevd");
      await backendApi.opprettOppgave(
        token,
        sakId,
        tildeltEnhetsnr,
        prioritet,
        fristDato,
        beskrivelse,
        oppgavetype,
      );
      return { ok: true };
    }
    case "overfor_ansvarlig": {
      const navIdent = hentTekstfelt(formData, "navIdent", "Ugyldig saksbehandler");
      const sak = await backendApi.overforAnsvarlig(token, sakId, navIdent);
      return { ok: true, sak };
    }
    case "fjern_delt_tilgang": {
      const navIdent = hentTekstfelt(formData, "navIdent", "Ugyldig saksbehandler");
      const sak = await backendApi.fjernDeltTilgang(token, sakId, navIdent);
      return { ok: true, sak };
    }
    case "videresend_seksjon":
    case "send_til_annen_enhet": {
      const enhet = hentTekstfelt(formData, "seksjon", "Ugyldig enhet");
      const beskrivelse = hentValgfriTekst(formData, "beskrivelse");
      await backendApi.videresend(token, sakId, enhet, beskrivelse ?? undefined);
      return { ok: true };
    }
    case "rediger_saksinformasjon": {
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

      const resultat = redigerSaksinformasjonSchema.safeParse(rådata);
      if (!resultat.success) {
        return {
          ok: false,
          feil: normaliserArbeidsgiverFeil(bygFeilkartFraIssues(resultat.error.issues)),
          verdier: {
            kategori: typeof rådata.kategori === "string" ? rådata.kategori : "",
            kilde: typeof rådata.kilde === "string" ? rådata.kilde : "",
            misbruktype: rådata.misbruktype,
            merking: rådata.merking,
            arbeidsgivere: rådata.arbeidsgivere,
            ytelser: ytelseRader.length > 0 ? ytelseRader : [{}],
          },
        } satisfies ActionResult;
      }

      const validert = resultat.data;

      await backendApi.redigerKontrollsak(token, sakId, {
        kategori: validert.kategori,
        kilde: validert.kilde,
        misbruktype: validert.misbruktype,
        merking: validert.merking,
        arbeidsgivere: validert.arbeidsgivere.map((orgnr) => ({ organisasjonsnummer: orgnr })),
        ytelser: validert.ytelser.map((y) => ({
          type: y.type ?? "",
          periodeFra: y.fraDato ?? "",
          periodeTil: y.tilDato ?? "",
          belop: y.beløp ?? null,
          endeligBelop: y.endeligBeløp ?? null,
        })),
      });
      return { ok: true };
    }
    case "koble_sak":
    case "fjern_kobling": {
      const kobletSakIdRaw = formData.get("relatertSakId");
      if (typeof kobletSakIdRaw !== "string" || !kobletSakIdRaw.trim()) {
        return {
          ok: false,
          feil: { skjema: ["Mangler sak-ID å koble til"] },
        } satisfies ActionResult;
      }
      const kobletSakId = Number(kobletSakIdRaw);
      if (!Number.isSafeInteger(kobletSakId) || kobletSakId <= 0) {
        return {
          ok: false,
          feil: { skjema: ["Ugyldig sak-ID"] },
        } satisfies ActionResult;
      }
      const innlogget = await hentInnloggetBruker({ request });
      const [nåværendeSak, kobletSak] = await Promise.all([
        backendApi.hentKontrollsak(token, sakId),
        backendApi.hentKontrollsak(token, String(kobletSakId)),
      ]);
      if (
        kobletSak.id === nåværendeSak.id ||
        (handling === "koble_sak" && kobletSak.personIdent !== nåværendeSak.personIdent)
      ) {
        return {
          ok: false,
          feil: { skjema: ["Kan ikke endre kobling til denne saken"] },
        } satisfies ActionResult;
      }
      if (
        !erSaksbehandlerPåSak(nåværendeSak, innlogget.navIdent) &&
        !erSaksbehandlerPåSak(kobletSak, innlogget.navIdent)
      ) {
        throw data("Du må være saksbehandler på minst én av sakene for å endre koblingen", {
          status: 403,
        });
      }
      try {
        await backendApi.kobleSak(
          token,
          sakId,
          kobletSakId,
          handling === "koble_sak" ? "KOBLE" : "FJERN",
        );
        return { ok: true };
      } catch (feil) {
        return {
          ok: false,
          feil: { skjema: [koblingsFeilmelding(feil)] },
        } satisfies ActionResult;
      }
    }
    case "legg_til_historikk": {
      const tittel = hentTekstfelt(formData, "tittel", "Tittel er påkrevd");
      const notat = hentValgfriTekst(formData, "notat") ?? "";
      const dato = hentTekstfelt(formData, "dato", "Dato er påkrevd");
      const tid = hentTekstfelt(formData, "tid", "Tid er påkrevd");
      const tidspunkt = lagTidspunktFraSkjema(dato, tid);
      try {
        await backendApi.opprettManuellHendelse(
          token,
          sakId,
          tittel,
          notat || undefined,
          tidspunkt,
        );
        return { ok: true };
      } catch (feil) {
        return { ok: false, feil: { skjema: [historikkFeilmelding(feil)] } } satisfies ActionResult;
      }
    }
    case "rediger_historikk": {
      const hendelseId = hentTekstfelt(formData, "hendelseId", "Hendelse-ID er påkrevd");
      const tittel = hentTekstfelt(formData, "tittel", "Tittel er påkrevd");
      const notat = hentValgfriTekst(formData, "notat") ?? "";
      const dato = hentTekstfelt(formData, "dato", "Dato er påkrevd");
      const tid = hentTekstfelt(formData, "tid", "Tid er påkrevd");
      const tidspunkt = lagTidspunktFraSkjema(dato, tid);
      try {
        await backendApi.redigerManuellHendelse(
          token,
          sakId,
          hendelseId,
          tittel,
          notat || undefined,
          tidspunkt,
        );
        return { ok: true };
      } catch (feil) {
        return { ok: false, feil: { skjema: [historikkFeilmelding(feil)] } } satisfies ActionResult;
      }
    }
    case "slett_historikk": {
      const hendelseId = hentTekstfelt(formData, "hendelseId", "Hendelse-ID er påkrevd");
      try {
        await backendApi.slettManuellHendelse(token, sakId, hendelseId);
        return { ok: true };
      } catch (feil) {
        return { ok: false, feil: { skjema: [historikkFeilmelding(feil)] } } satisfies ActionResult;
      }
    }
    default: {
      throw data("Ugyldig handling", { status: 400 });
    }
  }
}
