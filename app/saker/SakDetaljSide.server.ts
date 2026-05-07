import { data } from "react-router";
import { mockYtelser } from "~/fordeling/mock-data.server";
import { skalBrukeMockdata } from "~/config/env.server";
import { enhetAlternativer, redigerSaksinformasjonSchema } from "~/registrer-sak/validering";
import {
  bygFeilkartFraIssues,
  parseYtelseRader,
  type YtelseRadVerdier,
} from "~/registrer-sak/skjema-helpers";
import { hentAlleSaker } from "~/saker/mock-alle-saker.server";
import { mockSaksbehandlere, mockSaksbehandlerDetaljer } from "~/saker/mock-saksbehandlere.server";
import { mockSeksjoner } from "~/saker/mock-seksjoner.server";
import type { Blokkeringsarsak, KontrollsakSaksbehandler } from "~/saker/types.backend";
import { lagIsoTidspunktFraNorskDatoTid } from "~/utils/date-utils";
import { hentTekstfelt, hentValgfriTekst } from "~/utils/form-data";
import { hentFilerForSak } from "./filer/mock-data.server";
import { notatMalValg } from "./handlinger/notatValg";
import { erAktivSakKontrollsak } from "./handlinger/tilgjengeligeHandlinger";
import {
  hentHistorikk,
  leggTilHendelse,
  leggTilManuellHendelse,
} from "./historikk/mock-data.server";
import { finnSakMedReferanse } from "./id";
import { getSaksenhet } from "./selectors";
import type { KontrollsakStatus } from "./visning";
import type { Route } from "./+types/SakDetaljSide.route";

// --- Typer ---

type Feltfeil = Record<string, string[]>;

type RedigerSaksinformasjonData = {
  kategori: string;
  kilde: string;
  misbruktype: string[];
  merking: string[];
  ytelser: YtelseRadVerdier[];
};

type ActionResult =
  | { ok: true; sak?: Route.ComponentProps["loaderData"]["sak"] }
  | { ok: false; feil: Feltfeil; verdier?: RedigerSaksinformasjonData };

// --- Hjelpefunksjoner ---

const unsupportedKobleSakFeil = "Denne funksjonen er ikke tilgjengelig ennå.";

const gyldigeStatuser = new Set<KontrollsakStatus>([
  "OPPRETTET",
  "UTREDES",
  "STRAFFERETTSLIG_VURDERING",
  "ANMELDT",
  "HENLAGT",
  "AVSLUTTET",
]);

const gyldigeBlokkeringsarsaker = new Set<Blokkeringsarsak>([
  "VENTER_PA_INFORMASJON",
  "VENTER_PA_VEDTAK",
  "I_BERO",
]);

function erGyldigStatus(verdi: string): verdi is KontrollsakStatus {
  return gyldigeStatuser.has(verdi as KontrollsakStatus);
}

function erGyldigBlokkeringsarsak(verdi: string): verdi is Blokkeringsarsak {
  return gyldigeBlokkeringsarsaker.has(verdi as Blokkeringsarsak);
}

function getHendelsestypeForBlokkering(blokkert: Blokkeringsarsak) {
  return blokkert === "I_BERO" ? "SAK_SATT_I_BERO" : "SAK_SATT_PA_VENT";
}

function getHendelsestypeForStatusendring(status: KontrollsakStatus) {
  switch (status) {
    case "ANMELDT":
      return "POLITIANMELDT";
    case "HENLAGT":
      return "SAK_HENLAGT";
    default:
      return "STATUS_ENDRET";
  }
}

function finnSaksbehandlerDetalj(
  saksbehandlerDetaljer: KontrollsakSaksbehandler[],
  navIdent: string,
) {
  return (
    saksbehandlerDetaljer.find(
      (saksbehandler) => saksbehandler.navIdent === navIdent || saksbehandler.navn === navIdent,
    ) ?? null
  );
}

function lagTidspunktFraSkjema(dato: string, tid: string): string {
  return lagIsoTidspunktFraNorskDatoTid(dato, tid);
}

function finnNotatMalLabel(verdi: FormDataEntryValue | null): string | undefined {
  if (typeof verdi !== "string" || verdi.length === 0) return undefined;
  return notatMalValg.find((mal) => mal.verdi === verdi)?.label;
}

// --- Loader ---

export function loader({ request, params }: Route.LoaderArgs) {
  if (!skalBrukeMockdata) {
    // TODO: Implementer backend-kall for sakdetalj
    throw new Response("Sakdetalj er ikke tilgjengelig uten mockdata", { status: 501 });
  }

  const alleSaker = hentAlleSaker(request);
  const sak = finnSakMedReferanse(alleSaker, params.sakId);
  if (!sak) {
    throw data("Sak ikke funnet", { status: 404 });
  }
  const historikk = hentHistorikk(request, sak.id);
  const filer = hentFilerForSak(request, sak.id);
  const andreSaker = alleSaker.filter(
    (annenSak) => annenSak.personIdent === sak.personIdent && annenSak.id !== sak.id,
  );
  return {
    sak,
    historikk,
    filer,
    andreSaker,
    saksbehandlere: mockSaksbehandlere,
    saksbehandlerDetaljer: mockSaksbehandlerDetaljer,
    seksjoner: mockSeksjoner,
    ytelser: mockYtelser,
  };
}

// --- Action ---

export async function action({ request, params }: Route.ActionArgs) {
  if (!skalBrukeMockdata) {
    // TODO: Implementer backend-kall for sakdetalj-handlinger
    throw new Response("Sakdetalj-handlinger er ikke tilgjengelig uten mockdata", { status: 501 });
  }

  const formData = await request.formData();
  const handling = hentTekstfelt(formData, "handling", "Ugyldig handling");
  const sakId = params.sakId;

  const sak = finnSakMedReferanse(hentAlleSaker(request), sakId);
  if (!sak) {
    throw data("Sak ikke funnet", { status: 404 });
  }

  if (
    sak.status === "AVSLUTTET" &&
    (handling === "endre_status" || handling === "endre_blokkering" || handling === "gjenoppta")
  ) {
    throw data("Kan ikke endre avsluttet sak", { status: 400 });
  }

  const saksbehandlere = sak.saksbehandlere;

  switch (handling) {
    case "TILDEL": {
      const navIdent = hentTekstfelt(formData, "navIdent", "Ugyldig saksbehandler");
      const navn = hentValgfriTekst(formData, "navn") ?? navIdent;
      const valgtSaksbehandler = finnSaksbehandlerDetalj(mockSaksbehandlerDetaljer, navIdent) ?? {
        navIdent,
        navn,
        enhet: null,
      };

      sak.saksbehandlere.eier = valgtSaksbehandler;
      leggTilHendelse(request, sak, "SAK_TILDELT");
      break;
    }
    case "FRISTILL": {
      sak.saksbehandlere.eier = null;
      break;
    }
    case "endre_status": {
      const nyStatus = hentTekstfelt(formData, "status", "Ugyldig status");

      if (!erGyldigStatus(nyStatus)) {
        throw data("Ugyldig status", { status: 400 });
      }

      if (nyStatus === sak.status) {
        throw data("Status er uendret", { status: 400 });
      }

      const beskrivelse = hentValgfriTekst(formData, "beskrivelse");
      const forrigeBlokkering = sak.blokkert;

      sak.status = nyStatus;
      if (nyStatus === "AVSLUTTET") {
        sak.blokkert = null;
      }
      leggTilHendelse(request, sak, getHendelsestypeForStatusendring(nyStatus), undefined, {
        beskrivelse,
        blokkert: nyStatus === "AVSLUTTET" ? forrigeBlokkering : sak.blokkert,
      });
      break;
    }
    case "endre_blokkering": {
      const blokkert = hentTekstfelt(formData, "blokkert", "Ugyldig blokkeringsårsak");

      if (!erGyldigBlokkeringsarsak(blokkert)) {
        throw data("Ugyldig blokkeringsårsak", { status: 400 });
      }

      const beskrivelse = hentValgfriTekst(formData, "beskrivelse");

      sak.blokkert = blokkert;
      leggTilHendelse(request, sak, getHendelsestypeForBlokkering(blokkert), undefined, {
        beskrivelse,
      });
      break;
    }
    case "gjenoppta": {
      const forrigeBlokkering = sak.blokkert;

      if (forrigeBlokkering === null) {
        throw data("Saken er ikke blokkert", { status: 400 });
      }

      sak.blokkert = null;
      leggTilHendelse(request, sak, "SAK_GJENOPPTATT", undefined, {
        blokkert: forrigeBlokkering,
      });
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

      leggTilHendelse(request, sak, "ANSVARLIG_SAKSBEHANDLER_ENDRET", undefined, {
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
      leggTilHendelse(request, sak, "MOTTAKSENHET_ENDRET");
      break;
    }
    case "send_til_annen_enhet": {
      const nySeksjon = hentTekstfelt(formData, "seksjon", "Ugyldig enhet");

      if (!enhetAlternativer.includes(nySeksjon as (typeof enhetAlternativer)[number])) {
        throw data("Ugyldig enhet", { status: 400 });
      }

      if (nySeksjon === getSaksenhet(sak)) {
        throw data("Velg en annen enhet", { status: 400 });
      }

      sak.saksbehandlere.opprettetAv = {
        ...sak.saksbehandlere.opprettetAv,
        enhet: nySeksjon,
      };
      sak.saksbehandlere.eier = null;
      leggTilHendelse(request, sak, "MOTTAKSENHET_ENDRET");
      break;
    }
    case "henlegg": {
      sak.status = "AVSLUTTET";
      leggTilHendelse(request, sak, "SAK_HENLAGT");
      break;
    }
    case "rediger_saksinformasjon": {
      if (!erAktivSakKontrollsak(sak.status)) {
        return {
          ok: false,
          feil: { skjema: ["Saken kan ikke redigeres i denne statusen."] },
        } satisfies ActionResult;
      }

      const ytelseRader = parseYtelseRader(formData);
      const rådata = {
        kategori: formData.get("kategori") || undefined,
        kilde: formData.get("kilde") || undefined,
        misbruktype: formData
          .getAll("misbruktype")
          .filter((v): v is string => typeof v === "string" && v.length > 0),
        merking: formData
          .getAll("merking")
          .filter((v): v is string => typeof v === "string" && v.length > 0),
        ytelser: ytelseRader,
      };

      const verdier: RedigerSaksinformasjonData = {
        kategori: typeof rådata.kategori === "string" ? rådata.kategori : "",
        kilde: typeof rådata.kilde === "string" ? rådata.kilde : "",
        misbruktype: rådata.misbruktype,
        merking: rådata.merking,
        ytelser: ytelseRader.length > 0 ? ytelseRader : [{}],
      };

      const resultat = redigerSaksinformasjonSchema.safeParse(rådata);

      if (!resultat.success) {
        return {
          ok: false,
          feil: bygFeilkartFraIssues(resultat.error.issues),
          verdier,
        } satisfies ActionResult;
      }

      const validert = resultat.data;
      const eksisterendeYtelser = sak.ytelser;

      sak.kategori = validert.kategori;
      sak.misbruktype = [...validert.misbruktype];
      sak.merking = validert.merking[0] ?? null;
      sak.kilde = validert.kilde;
      sak.ytelser = validert.ytelser.map((ytelse, indeks) => ({
        id: eksisterendeYtelser[indeks]?.id ?? crypto.randomUUID(),
        type: ytelse.type ?? "",
        periodeFra: ytelse.fraDato ?? "",
        periodeTil: ytelse.tilDato ?? "",
        belop: ytelse.beløp ?? null,
      }));
      leggTilHendelse(request, sak, "SAKSINFORMASJON_ENDRET");
      return { ok: true, sak } satisfies ActionResult;
    }
    case "koble_sak": {
      return {
        ok: false,
        feil: { skjema: [unsupportedKobleSakFeil] },
      } satisfies ActionResult;
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
        leggTilHendelse(request, sak, "TILGANG_DELT", undefined, {
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

        leggTilHendelse(request, sak, "TILGANG_FJERNET", undefined, {
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
      leggTilManuellHendelse(request, sak, tittel, notat, tidspunkt);
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

      leggTilHendelse(request, sak, "NOTAT_SENDT", undefined, {
        beskrivelse: deler.join("\n"),
      });
      break;
    }
    default: {
      throw data("Ugyldig handling", { status: 400 });
    }
  }

  return { ok: true } satisfies ActionResult;
}
