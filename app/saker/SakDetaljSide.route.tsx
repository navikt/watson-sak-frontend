import { ArrowLeftIcon, PencilIcon, PlusIcon } from "@navikt/aksel-icons";
import {
  Alert,
  BodyShort,
  Button,
  CopyButton,
  Detail,
  ErrorSummary,
  Heading,
  HGrid,
  HStack,
  Page,
  Select,
  Table,
  Tag,
  UNSAFE_Combobox,
  VStack,
} from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { useEffect, useId, useMemo, useState } from "react";
import {
  data,
  useBeforeUnload,
  useBlocker,
  useFetcher,
  useLoaderData,
  useNavigate,
} from "react-router";
import { mockYtelser } from "~/fordeling/mock-data.server";
import { Kort } from "~/komponenter/Kort";
import {
  kategoriAlternativer,
  kildeAlternativer,
  kildeEtiketter,
  merkingAlternativer,
  merkingEtiketter,
  misbrukstypePerKategori,
  redigerSaksinformasjonSchema,
} from "~/registrer-sak/validering";
import {
  ankerIdForFelt,
  type Feil,
  førsteFeilForFelt,
  samleFeilElementer,
  YtelseRadFelt,
} from "~/registrer-sak/YtelseRadFelt";
import {
  bygFeilkartFraIssues,
  parseYtelseRader,
  type YtelseRadVerdier,
} from "~/registrer-sak/skjema-helpers";
import {
  kontrollsakMisbrukstypeEtiketter,
  kontrollsakMisbrukstypeVerdier,
} from "~/saker/kategorier";
import { mockSaksbehandlere, mockSaksbehandlerDetaljer } from "~/saker/mock-saksbehandlere.server";
import { mockSeksjoner } from "~/saker/mock-seksjoner.server";
import type { Blokkeringsarsak, KontrollsakSaksbehandler } from "~/saker/types.backend";
import type { Route } from "./+types/SakDetaljSide.route";
import { hentFilerForSak } from "./filer/mock-data.server";
import { SakFilområde } from "./filer/SakFilområde";
import { SakHandlingerKnapper } from "./handlinger/SakHandlingerKnapper";
import { erAktivSakKontrollsak } from "./handlinger/tilgjengeligeHandlinger";
import { SakHistorikk } from "./historikk/SakHistorikk";
import {
  hentHistorikk,
  leggTilHendelse,
  leggTilManuellHendelse,
} from "./historikk/mock-data.server";
import { finnSakMedReferanse, getSaksreferanse } from "./id";
import { hentAlleSaker } from "./mock-alle-saker.server";
import { SakerPåSammePerson } from "./komponenter/SakerPåSammePerson";
import { SaksbehandlereKort } from "./komponenter/SaksbehandlereKort";
import {
  getAlder,
  getKategoriText,
  getMisbrukstyper,
  getNavn,
  getStatusVariantForSak,
  getTags,
} from "./selectors";
import {
  formaterBelop,
  getKildeText,
  getPersonIdent,
  getStatus,
  type KontrollsakStatus,
} from "./visning";

type Feltfeil = Record<string, string[]>;

type RedigerSaksinformasjonData = {
  kategori: string;
  kilde: string;
  misbruktype: string[];
  merking: string[];
  ytelser: YtelseRadVerdier[];
};

type ActionResult =
  | { ok: true }
  | { ok: false; feil: Feltfeil; verdier?: RedigerSaksinformasjonData };
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

function hentDetaljSaker() {
  return hentAlleSaker();
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

function hentFørsteVerdi<T>(verdier: T[] | null | undefined): T | undefined {
  return verdier?.[0];
}

function formaterIsoTilNorskDato(iso: string | undefined | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso ?? "";
  const dag = `${date.getDate()}`.padStart(2, "0");
  const måned = `${date.getMonth() + 1}`.padStart(2, "0");
  const år = date.getFullYear();
  return `${dag}.${måned}.${år}`;
}

function formaterPeriode(fra: string | null | undefined, til: string | null | undefined): string {
  const fraTekst = formaterIsoTilNorskDato(fra);
  const tilTekst = formaterIsoTilNorskDato(til);
  if (fraTekst && tilTekst) return `${fraTekst} – ${tilTekst}`;
  if (fraTekst) return `${fraTekst} –`;
  if (tilTekst) return `– ${tilTekst}`;
  return "–";
}

function lagYtelseRaderFraSak(sak: Route.ComponentProps["loaderData"]["sak"]): YtelseRadVerdier[] {
  if (sak.ytelser.length === 0) {
    return [{}];
  }
  return sak.ytelser.map((ytelse) => ({
    type: ytelse.type || undefined,
    fraDato: formaterIsoTilNorskDato(ytelse.periodeFra) || undefined,
    tilDato: formaterIsoTilNorskDato(ytelse.periodeTil) || undefined,
    beløp: ytelse.belop !== null && ytelse.belop !== undefined ? String(ytelse.belop) : undefined,
  }));
}

function lagRedigeringsdata(
  sak: Route.ComponentProps["loaderData"]["sak"],
): RedigerSaksinformasjonData {
  return {
    kategori: sak.kategori,
    kilde: sak.kilde,
    misbruktype: [...sak.misbruktype],
    merking: sak.merking ? [sak.merking] : [],
    ytelser: lagYtelseRaderFraSak(sak),
  };
}

function erLikeRedigeringsdata(a: RedigerSaksinformasjonData, b: RedigerSaksinformasjonData) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function hentMisbrukstypeAlternativer(kategori: string): readonly string[] {
  if (!kategori) {
    return [];
  }
  return (misbrukstypePerKategori as Partial<Record<string, readonly string[]>>)[kategori] ?? [];
}

function lagTidspunktFraSkjema(dato: string, tid: string): string {
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(dato)) {
    const [dag, måned, år] = dato.split(".");
    return new Date(`${år}-${måned}-${dag}T${tid ?? "00:00"}:00`).toISOString();
  }
  return new Date(`${dato}T${tid ?? "00:00"}:00`).toISOString();
}

export function loader({ params }: Route.LoaderArgs) {
  const alleSaker = hentDetaljSaker();
  const sak = finnSakMedReferanse(alleSaker, params.sakId);
  if (!sak) {
    throw data("Sak ikke funnet", { status: 404 });
  }
  const historikk = hentHistorikk(sak.id);
  const filer = hentFilerForSak(sak.id);
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

function hentDelteSaksbehandlere(sak: Route.ComponentProps["loaderData"]["sak"]) {
  return sak.saksbehandlere.deltMed;
}

function hentTekstfelt(formData: FormData, felt: string, feilmelding: string) {
  const verdi = formData.get(felt);

  if (typeof verdi !== "string" || verdi.trim().length === 0) {
    throw data(feilmelding, { status: 400 });
  }

  return verdi;
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const handling = formData.get("handling") as string;
  const sakId = params.sakId;

  const sak = finnSakMedReferanse(hentDetaljSaker(), sakId);
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
      const navn = (formData.get("navn") as string | null) ?? navIdent;
      const valgtSaksbehandler = finnSaksbehandlerDetalj(mockSaksbehandlerDetaljer, navIdent) ?? {
        navIdent,
        navn,
        enhet: null,
      };

      sak.saksbehandlere.eier = valgtSaksbehandler;
      leggTilHendelse(sak, "SAK_TILDELT");
      break;
    }
    case "FRISTILL": {
      sak.saksbehandlere.eier = null;
      break;
    }
    case "endre_status": {
      const nyStatus = formData.get("status") as string;

      if (!erGyldigStatus(nyStatus)) {
        throw data("Ugyldig status", { status: 400 });
      }

      if (nyStatus === sak.status) {
        throw data("Status er uendret", { status: 400 });
      }

      const beskrivelse = (formData.get("beskrivelse") as string | null) || undefined;
      const forrigeBlokkering = sak.blokkert;

      sak.status = nyStatus;
      if (nyStatus === "AVSLUTTET") {
        sak.blokkert = null;
      }
      leggTilHendelse(sak, getHendelsestypeForStatusendring(nyStatus), undefined, {
        beskrivelse,
        blokkert: nyStatus === "AVSLUTTET" ? forrigeBlokkering : sak.blokkert,
      });
      break;
    }
    case "endre_blokkering": {
      const blokkert = formData.get("blokkert") as string;

      if (!erGyldigBlokkeringsarsak(blokkert)) {
        throw data("Ugyldig blokkeringsårsak", { status: 400 });
      }

      const beskrivelse = (formData.get("beskrivelse") as string | null) || undefined;

      sak.blokkert = blokkert;
      leggTilHendelse(sak, getHendelsestypeForBlokkering(blokkert), undefined, { beskrivelse });
      break;
    }
    case "gjenoppta": {
      const forrigeBlokkering = sak.blokkert;

      if (forrigeBlokkering === null) {
        throw data("Saken er ikke blokkert", { status: 400 });
      }

      sak.blokkert = null;
      leggTilHendelse(sak, "SAK_GJENOPPTATT", undefined, { blokkert: forrigeBlokkering });
      break;
    }
    case "overfor_ansvarlig": {
      const navIdent = formData.get("navIdent") as string;
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

      leggTilHendelse(sak, "ANSVARLIG_SAKSBEHANDLER_ENDRET", undefined, {
        berortSaksbehandlerNavn: valgtSaksbehandler.navn,
        berortSaksbehandlerNavIdent: valgtSaksbehandler.navIdent,
        berortSaksbehandlerEnhet,
      });
      break;
    }
    case "videresend_seksjon": {
      const nySeksjon = formData.get("seksjon") as string;

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
      leggTilHendelse(sak, "MOTTAKSENHET_ENDRET");
      break;
    }
    case "henlegg": {
      sak.status = "AVSLUTTET";
      leggTilHendelse(sak, "SAK_HENLAGT");
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

      const data = resultat.data;
      const eksisterendeYtelser = sak.ytelser;

      sak.kategori = data.kategori;
      sak.misbruktype = [...data.misbruktype];
      sak.merking = data.merking[0] ?? null;
      sak.kilde = data.kilde;
      sak.ytelser = data.ytelser.map((ytelse, indeks) => ({
        id: eksisterendeYtelser[indeks]?.id ?? crypto.randomUUID(),
        type: ytelse.type ?? "",
        periodeFra: ytelse.fraDato ?? "",
        periodeTil: ytelse.tilDato ?? "",
        belop: ytelse.beløp ?? null,
      }));
      leggTilHendelse(sak, "SAKSINFORMASJON_ENDRET");
      break;
    }
    case "koble_sak": {
      return { ok: false, feil: { skjema: [unsupportedKobleSakFeil] } } satisfies ActionResult;
    }
    case "del_tilgang": {
      const navIdent = formData.get("navIdent") as string;
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
        leggTilHendelse(sak, "TILGANG_DELT", undefined, {
          berortSaksbehandlerNavn: valgtSaksbehandler.navn,
          berortSaksbehandlerNavIdent: valgtSaksbehandler.navIdent,
          berortSaksbehandlerEnhet,
        });
      }

      break;
    }
    case "fjern_delt_tilgang": {
      const navIdent = formData.get("navIdent") as string;
      const saksbehandler = saksbehandlere.deltMed.find(
        (deltSaksbehandler) => deltSaksbehandler.navIdent === navIdent,
      );

      saksbehandlere.deltMed = saksbehandlere.deltMed.filter(
        (deltSaksbehandler) => deltSaksbehandler.navIdent !== navIdent,
      );

      if (saksbehandler) {
        const berortSaksbehandlerEnhet =
          saksbehandler.enhet === null ? undefined : saksbehandler.enhet;

        leggTilHendelse(sak, "TILGANG_FJERNET", undefined, {
          berortSaksbehandlerNavn: saksbehandler.navn,
          berortSaksbehandlerNavIdent: saksbehandler.navIdent,
          berortSaksbehandlerEnhet,
        });
      }

      break;
    }
    case "legg_til_historikk": {
      const tittel = formData.get("tittel") as string;
      const notat = formData.get("notat") as string;
      const dato = formData.get("dato") as string;
      const tid = formData.get("tid") as string;

      if (!tittel) {
        throw data("Tittel er påkrevd", { status: 400 });
      }

      const tidspunkt = lagTidspunktFraSkjema(dato, tid);
      leggTilManuellHendelse(sak, tittel, notat ?? "", tidspunkt);
      break;
    }
    case "send_notat": {
      const notatRaw = formData.get("notat");
      if (typeof notatRaw !== "string" || !notatRaw.trim()) {
        throw data("Notat er påkrevd", { status: 400 });
      }
      const notat = notatRaw.trim();
      const knyttTilOppgave = formData.get("knyttTilOppgave") === "true";
      const oppgavetype = (formData.get("oppgavetype") as string | null) ?? "";

      const deler = [notat];
      if (knyttTilOppgave) {
        deler.push(`Knyttet til oppgave${oppgavetype ? `: ${oppgavetype}` : ""}`);
      }

      leggTilHendelse(sak, "NOTAT_SENDT", undefined, { beskrivelse: deler.join("\n") });
      break;
    }
    default: {
      throw data("Ugyldig handling", { status: 400 });
    }
  }

  return { ok: true } satisfies ActionResult;
}

function Felt({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <VStack gap="space-1">
      <Detail className="text-ax-text-neutral-subtle" uppercase>
        {label}
      </Detail>
      <BodyShort>{children}</BodyShort>
    </VStack>
  );
}

export default function SakDetaljSide() {
  const { sak, historikk, filer, andreSaker, saksbehandlerDetaljer, seksjoner, ytelser } =
    useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher<typeof action>();
  const personIdent = getPersonIdent(sak);
  const statusTekst = getStatus(sak);
  const kildeTekst = getKildeText(sak);
  const erAktiv = erAktivSakKontrollsak(sak.status);
  const saksreferanse = getSaksreferanse(sak.id);
  const navn = getNavn(sak);
  const alder = getAlder(sak);
  const kategoriText = getKategoriText(sak);
  const misbrukstyper = getMisbrukstyper(sak);
  const tags = getTags(sak);
  const ansvarligSaksbehandler = sak.saksbehandlere.eier
    ? finnSaksbehandlerDetalj(saksbehandlerDetaljer, sak.saksbehandlere.eier.navIdent)
    : null;
  const delteSaksbehandlere = hentDelteSaksbehandlere(sak);
  const [redigerer, setRedigerer] = useState(false);
  const [redigeringsøkt, setRedigeringsøkt] = useState(0);
  const [visFeil, setVisFeil] = useState(false);
  const [lokaleVerdier, setLokaleVerdier] = useState<RedigerSaksinformasjonData>(() =>
    lagRedigeringsdata(sak),
  );
  const utgangspunkt = useMemo(() => lagRedigeringsdata(sak), [sak]);
  const feil: Feltfeil | undefined =
    visFeil && fetcher.data && !fetcher.data.ok ? fetcher.data.feil : undefined;
  const misbrukstypeAlternativer = hentMisbrukstypeAlternativer(lokaleVerdier.kategori);
  const visMisbruktype = misbrukstypeAlternativer.length > 0;
  const harUlagredeEndringer = redigerer && !erLikeRedigeringsdata(lokaleVerdier, utgangspunkt);
  const blocker = useBlocker(harUlagredeEndringer);
  const errorSummaryId = useId();
  const feilElementer = samleFeilElementer(feil);

  const tittel = navn
    ? `Sak ${saksreferanse} – ${navn}${alder !== null ? ` (${alder})` : ""}`
    : `Sak ${saksreferanse}`;

  useEffect(() => {
    if (fetcher.data?.ok) {
      setVisFeil(false);
      setRedigerer(false);
      return;
    }

    if (fetcher.data && !fetcher.data.ok) {
      setVisFeil(true);
      if (fetcher.data.verdier) {
        setLokaleVerdier(fetcher.data.verdier);
      }
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (blocker.state !== "blocked") {
      return;
    }

    const skalForlateSiden = window.confirm(
      "Du har ulagrede endringer. Er du sikker på at du vil forlate siden?",
    );

    if (skalForlateSiden) {
      blocker.proceed();
      return;
    }

    blocker.reset();
  }, [blocker]);

  useBeforeUnload((event) => {
    if (!harUlagredeEndringer) {
      return;
    }

    event.preventDefault();
    event.returnValue = "";
  });

  function oppdaterLokaleVerdier<K extends keyof RedigerSaksinformasjonData>(
    felt: K,
    verdi: RedigerSaksinformasjonData[K],
  ) {
    setLokaleVerdier((gjeldende) => ({ ...gjeldende, [felt]: verdi }));
  }

  function leggTilYtelseRad() {
    setLokaleVerdier((gjeldende) => ({ ...gjeldende, ytelser: [...gjeldende.ytelser, {}] }));
  }

  function fjernYtelseRad(indeks: number) {
    setLokaleVerdier((gjeldende) => {
      const nye = gjeldende.ytelser.filter((_, i) => i !== indeks);
      return { ...gjeldende, ytelser: nye.length > 0 ? nye : [{}] };
    });
  }

  function startRedigering() {
    setRedigeringsøkt((gjeldende) => gjeldende + 1);
    setVisFeil(false);
    setRedigerer(true);
    setLokaleVerdier(utgangspunkt);
  }

  function avbrytRedigering() {
    setVisFeil(false);
    setRedigerer(false);
    setLokaleVerdier(utgangspunkt);
  }

  return (
    <Page>
      <title>{`Sak ${saksreferanse} – Watson Sak`}</title>
      <PageBlock width="xl" gutters className="!mx-0">
        <VStack gap="space-12" className="py-6">
          <div>
            <Button
              type="button"
              variant="tertiary"
              size="small"
              icon={<ArrowLeftIcon aria-hidden />}
              onClick={() => navigate(-1)}
            >
              Tilbake
            </Button>
          </div>

          <HGrid columns={{ xs: 1, md: "1fr 280px" }} gap="space-8">
            <VStack gap="space-8">
              <Kort>
                <VStack gap="space-4">
                  <HStack justify="space-between" align="start">
                    <VStack gap="space-2">
                      <Heading level="1" size="large">
                        {tittel}
                      </Heading>
                    </VStack>
                    <Tag variant={getStatusVariantForSak(sak)}>{statusTekst}</Tag>
                  </HStack>

                  <hr className="border-ax-border-neutral-subtle" />

                  {redigerer ? (
                    <fetcher.Form method="post" key={redigeringsøkt}>
                      <input type="hidden" name="handling" value="rediger_saksinformasjon" />

                      <VStack gap="space-6">
                        {feilElementer.length > 0 && (
                          <ErrorSummary
                            id={errorSummaryId}
                            heading="Du må rette følgende feil før du kan lagre:"
                          >
                            {feilElementer.map((element) => (
                              <ErrorSummary.Item key={element.id} href={`#${element.id}`}>
                                {element.melding}
                              </ErrorSummary.Item>
                            ))}
                          </ErrorSummary>
                        )}

                        {feil?.skjema?.[0] && <Alert variant="error">{feil.skjema[0]}</Alert>}

                        <VStack gap="space-1">
                          <Detail className="text-ax-text-neutral-subtle" uppercase>
                            Personnummer
                          </Detail>
                          <HStack gap="space-1" align="center">
                            <BodyShort>{personIdent}</BodyShort>
                            <CopyButton size="xsmall" copyText={personIdent} />
                          </HStack>
                        </VStack>

                        <HGrid columns={{ xs: 1, md: 2 }} gap="space-4">
                          <Select
                            id={ankerIdForFelt("kategori")}
                            name="kategori"
                            label="Kategori"
                            size="small"
                            value={lokaleVerdier.kategori}
                            error={førsteFeilForFelt(feil, "kategori")}
                            onChange={(event) => {
                              const kategori = event.target.value;
                              const gyldige = hentMisbrukstypeAlternativer(kategori);
                              setLokaleVerdier((gjeldende) => ({
                                ...gjeldende,
                                kategori,
                                misbruktype: gjeldende.misbruktype.filter((type) =>
                                  gyldige.includes(type),
                                ),
                              }));
                            }}
                          >
                            <option value="">Velg kategori</option>
                            {kategoriAlternativer.map((kategori) => (
                              <option key={kategori} value={kategori}>
                                {getKategoriText({ ...sak, kategori }) ?? kategori}
                              </option>
                            ))}
                          </Select>

                          <Select
                            id={ankerIdForFelt("kilde")}
                            name="kilde"
                            label="Kilde"
                            size="small"
                            value={lokaleVerdier.kilde}
                            error={førsteFeilForFelt(feil, "kilde")}
                            onChange={(event) => oppdaterLokaleVerdier("kilde", event.target.value)}
                          >
                            <option value="">Velg kilde</option>
                            {kildeAlternativer.map((kilde) => (
                              <option key={kilde} value={kilde}>
                                {kildeEtiketter[kilde] ?? kilde}
                              </option>
                            ))}
                          </Select>
                        </HGrid>

                        <HGrid columns={{ xs: 1, md: 2 }} gap="space-4">
                          {visMisbruktype && (
                            <div id={ankerIdForFelt("misbruktype")}>
                              <UNSAFE_Combobox
                                label="Misbruktype"
                                size="small"
                                options={misbrukstypeAlternativer.map((type) => ({
                                  label:
                                    kontrollsakMisbrukstypeEtiketter[
                                      type as (typeof kontrollsakMisbrukstypeVerdier)[number]
                                    ] ?? type,
                                  value: type,
                                }))}
                                isMultiSelect
                                selectedOptions={lokaleVerdier.misbruktype}
                                onToggleSelected={(option, isSelected) => {
                                  setLokaleVerdier((gjeldende) => {
                                    const har = gjeldende.misbruktype.includes(option);
                                    if (isSelected && !har) {
                                      return {
                                        ...gjeldende,
                                        misbruktype: [...gjeldende.misbruktype, option],
                                      };
                                    }
                                    if (!isSelected) {
                                      return {
                                        ...gjeldende,
                                        misbruktype: gjeldende.misbruktype.filter(
                                          (v) => v !== option,
                                        ),
                                      };
                                    }
                                    return gjeldende;
                                  });
                                }}
                                error={førsteFeilForFelt(feil, "misbruktype")}
                              />
                              {lokaleVerdier.misbruktype.map((type) => (
                                <input key={type} type="hidden" name="misbruktype" value={type} />
                              ))}
                            </div>
                          )}

                          <div id={ankerIdForFelt("merking")}>
                            <UNSAFE_Combobox
                              label="Merking"
                              size="small"
                              options={merkingAlternativer.map((merking) => ({
                                label: merkingEtiketter[merking] ?? merking,
                                value: merking,
                              }))}
                              isMultiSelect
                              selectedOptions={lokaleVerdier.merking}
                              onToggleSelected={(option, isSelected) => {
                                setLokaleVerdier((gjeldende) => {
                                  const har = gjeldende.merking.includes(option);
                                  if (isSelected && !har) {
                                    return {
                                      ...gjeldende,
                                      merking: [...gjeldende.merking, option],
                                    };
                                  }
                                  if (!isSelected) {
                                    return {
                                      ...gjeldende,
                                      merking: gjeldende.merking.filter((v) => v !== option),
                                    };
                                  }
                                  return gjeldende;
                                });
                              }}
                              error={førsteFeilForFelt(feil, "merking")}
                            />
                            {lokaleVerdier.merking.map((merking) => (
                              <input key={merking} type="hidden" name="merking" value={merking} />
                            ))}
                          </div>
                        </HGrid>

                        <hr className="border-ax-border-neutral-subtle" />

                        <VStack gap="space-8">
                          <Heading level="2" size="small">
                            Ytelser
                          </Heading>
                          {lokaleVerdier.ytelser.map((rad, indeks) => (
                            <YtelseRadFelt
                              key={`${redigeringsøkt}-${indeks}`}
                              indeks={indeks}
                              ytelser={ytelser}
                              kanFjernes={lokaleVerdier.ytelser.length > 1}
                              onFjern={() => fjernYtelseRad(indeks)}
                              defaults={rad}
                              feil={feil}
                              size="small"
                            />
                          ))}
                          <div>
                            <Button
                              type="button"
                              variant="tertiary"
                              size="small"
                              icon={<PlusIcon aria-hidden />}
                              onClick={leggTilYtelseRad}
                            >
                              Legg til ytelse
                            </Button>
                          </div>
                        </VStack>

                        <HStack justify="end" gap="space-4">
                          <Button
                            size="small"
                            type="button"
                            variant="secondary"
                            onClick={avbrytRedigering}
                          >
                            Avbryt
                          </Button>
                          <Button size="small" type="submit" loading={fetcher.state !== "idle"}>
                            Lagre
                          </Button>
                        </HStack>
                      </VStack>
                    </fetcher.Form>
                  ) : (
                    <VStack gap="space-4">
                      <HGrid columns={{ xs: 1, md: 2 }} gap="space-6">
                        <VStack gap="space-4">
                          <VStack gap="space-1">
                            <Detail className="text-ax-text-neutral-subtle" uppercase>
                              Personnummer
                            </Detail>
                            <HStack gap="space-1" align="center">
                              <BodyShort>{personIdent}</BodyShort>
                              <CopyButton size="xsmall" copyText={personIdent} />
                            </HStack>
                          </VStack>

                          {kategoriText && (
                            <VStack gap="space-1">
                              <Detail className="text-ax-text-neutral-subtle" uppercase>
                                Kategori
                              </Detail>
                              <div>
                                <Tag variant="neutral" size="small">
                                  {kategoriText}
                                </Tag>
                              </div>
                            </VStack>
                          )}

                          {misbrukstyper.length > 0 && (
                            <VStack gap="space-1">
                              <Detail className="text-ax-text-neutral-subtle" uppercase>
                                Misbrukstype
                              </Detail>
                              <HStack gap="space-2" wrap>
                                {misbrukstyper.map((type) => (
                                  <Tag key={type} variant="warning" size="small">
                                    {type}
                                  </Tag>
                                ))}
                              </HStack>
                            </VStack>
                          )}

                          {tags.length > 0 && (
                            <VStack gap="space-1">
                              <Detail className="text-ax-text-neutral-subtle" uppercase>
                                Merking
                              </Detail>
                              <HStack gap="space-2" wrap>
                                {tags.map((tag) => (
                                  <Tag key={tag} variant="neutral" size="small">
                                    {merkingEtiketter[tag as keyof typeof merkingEtiketter] ?? tag}
                                  </Tag>
                                ))}
                              </HStack>
                            </VStack>
                          )}

                          <Felt label="Kilde">{kildeTekst}</Felt>
                        </VStack>

                        <VStack gap="space-1">
                          <Detail className="text-ax-text-neutral-subtle" uppercase>
                            Ytelser
                          </Detail>
                          {sak.ytelser.length === 0 ? (
                            <BodyShort>–</BodyShort>
                          ) : (
                            <Table size="small" className="[&_td]:py-1 [&_th]:py-1 text-sm">
                              <Table.Header>
                                <Table.Row>
                                  <Table.HeaderCell scope="col">Ytelse</Table.HeaderCell>
                                  <Table.HeaderCell scope="col">Periode</Table.HeaderCell>
                                  <Table.HeaderCell scope="col">Ca. beløp</Table.HeaderCell>
                                </Table.Row>
                              </Table.Header>
                              <Table.Body>
                                {sak.ytelser.map((ytelse) => (
                                  <Table.Row key={ytelse.id}>
                                    <Table.DataCell>
                                      <Tag variant="success" size="xsmall">
                                        {ytelse.type}
                                      </Tag>
                                    </Table.DataCell>
                                    <Table.DataCell>
                                      {formaterPeriode(ytelse.periodeFra, ytelse.periodeTil)}
                                    </Table.DataCell>
                                    <Table.DataCell>
                                      {ytelse.belop !== null && ytelse.belop !== undefined
                                        ? formaterBelop(ytelse.belop)
                                        : "–"}
                                    </Table.DataCell>
                                  </Table.Row>
                                ))}
                              </Table.Body>
                            </Table>
                          )}
                        </VStack>
                      </HGrid>

                      {erAktiv && (
                        <HStack justify="end">
                          <Button
                            type="button"
                            variant="tertiary"
                            size="xsmall"
                            icon={<PencilIcon aria-hidden />}
                            aria-label="Rediger saksinformasjon"
                            onClick={startRedigering}
                          >
                            Rediger
                          </Button>
                        </HStack>
                      )}
                    </VStack>
                  )}
                </VStack>
              </Kort>

              <SakFilområde filer={filer} redigerbar={erAktiv} />

              <SakerPåSammePerson saker={andreSaker} gjeldendeSakId={sak.id} />
            </VStack>

            <VStack gap="space-6" className="md:sticky md:top-4 md:self-start">
              <SaksbehandlereKort
                sak={{
                  ...sak,
                  saksbehandlere: { ...sak.saksbehandlere, deltMed: delteSaksbehandlere },
                }}
                saksbehandlerDetaljer={saksbehandlerDetaljer}
                ansvarligSaksbehandler={ansvarligSaksbehandler}
              />

              <SakHandlingerKnapper
                sak={sak}
                seksjoner={seksjoner}
                historikk={historikk}
                filer={filer}
              />

              <SakHistorikk sakId={sak.id} hendelser={historikk} />
            </VStack>
          </HGrid>
        </VStack>
      </PageBlock>
    </Page>
  );
}
