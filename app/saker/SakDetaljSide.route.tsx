import { ArrowLeftIcon, PencilIcon } from "@navikt/aksel-icons";
import {
  Alert,
  BodyShort,
  Button,
  CopyButton,
  DatePicker,
  Detail,
  Heading,
  HGrid,
  HStack,
  Page,
  Select,
  Tag,
  TextField,
  UNSAFE_Combobox,
  VStack,
  useRangeDatepicker,
} from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { useEffect, useState } from "react";
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
  getBelop,
  getKategoriText,
  getMisbrukstyper,
  getNavn,
  getPeriodeText,
  getStatusVariantForSak,
  getTags,
} from "./selectors";
import {
  formaterBelop,
  getKildeText,
  getPersonIdent,
  getStatus,
  getYtelseTyper,
  type KontrollsakStatus,
} from "./visning";

type Feltfeil = Partial<
  Record<
    | "kategori"
    | "misbruktype"
    | "merking"
    | "kilde"
    | "fraDato"
    | "tilDato"
    | "ytelser"
    | "caBeløp"
    | "skjema",
    string[]
  >
>;

type RedigerSaksinformasjonData = {
  kategori: string;
  misbruktype: string;
  merking: string;
  kilde: string;
  fraDato: string;
  tilDato: string;
  ytelser: string[];
  caBeløp: string;
};

type ActionResult = { ok: true } | { ok: false; feil: Feltfeil };
const unsupportedRedigeringFeil = "Saken kan ikke redigeres med denne løsningen ennå.";
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

function lagRedigeringsdata(
  sak: Route.ComponentProps["loaderData"]["sak"],
): RedigerSaksinformasjonData {
  const førsteYtelse = sak.ytelser[0];

  return {
    kategori: sak.kategori,
    misbruktype: hentFørsteVerdi(sak.misbruktype) ?? "",
    merking: sak.merking ?? "",
    kilde: sak.kilde,
    fraDato: førsteYtelse?.periodeFra ? formaterTallDatoForInput(førsteYtelse.periodeFra) : "",
    tilDato: førsteYtelse?.periodeTil ? formaterTallDatoForInput(førsteYtelse.periodeTil) : "",
    ytelser: sak.ytelser.map((ytelse) => ytelse.type),
    caBeløp: sak.ytelser.find((ytelse) => ytelse.belop !== null)?.belop?.toString() ?? "",
  };
}

function erLikeRedigeringsdata(a: RedigerSaksinformasjonData, b: RedigerSaksinformasjonData) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function hentMisbrukstypeAlternativer(kategori: string) {
  if (!kategori) {
    return [];
  }

  return (misbrukstypePerKategori as Partial<Record<string, readonly string[]>>)[kategori] ?? [];
}

function tilDate(verdi: string) {
  if (!verdi) {
    return undefined;
  }

  if (/^\d{2}\.\d{2}\.\d{4}$/.test(verdi)) {
    const [dag, måned, år] = verdi.split(".");
    return new Date(`${år}-${måned}-${dag}`);
  }

  return new Date(verdi);
}

function formaterTallDatoForInput(isoDato: string) {
  const date = new Date(isoDato);

  if (Number.isNaN(date.getTime())) {
    return isoDato;
  }

  const dag = `${date.getDate()}`.padStart(2, "0");
  const måned = `${date.getMonth() + 1}`.padStart(2, "0");
  const år = date.getFullYear();

  return `${dag}.${måned}.${år}`;
}

function lagTidspunktFraSkjema(dato: string, tid: string): string {
  if (/^\d{2}\.\d{2}\.\d{4}$/.test(dato)) {
    const [dag, måned, år] = dato.split(".");
    return new Date(`${år}-${måned}-${dag}T${tid ?? "00:00"}:00`).toISOString();
  }
  return new Date(`${dato}T${tid ?? "00:00"}:00`).toISOString();
}

function harStøttetRedigeringsmodell(sak: Route.ComponentProps["loaderData"]["sak"]) {
  const antallMisbrukstyper = sak.misbruktype.length;
  const antallMerkinger = sak.merking ? 1 : 0;
  const unikePerioder = new Set(
    sak.ytelser.map((ytelse) => `${ytelse.periodeFra}-${ytelse.periodeTil}`),
  );

  return antallMisbrukstyper <= 1 && antallMerkinger <= 1 && unikePerioder.size <= 1;
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
      if (!erAktivSakKontrollsak(sak.status) || !harStøttetRedigeringsmodell(sak)) {
        return { ok: false, feil: { skjema: [unsupportedRedigeringFeil] } } satisfies ActionResult;
      }

      const rådata = {
        kategori: formData.get("kategori"),
        misbruktype: formData.get("misbruktype") || undefined,
        merking: formData.get("merking") || undefined,
        kilde: formData.get("kilde"),
        fraDato: formData.get("fraDato") || undefined,
        tilDato: formData.get("tilDato") || undefined,
        ytelser: formData.getAll("ytelser"),
        caBeløp: formData.get("caBeløp") || undefined,
      };

      const resultat = redigerSaksinformasjonSchema.safeParse(rådata);

      if (!resultat.success) {
        return { ok: false, feil: resultat.error.flatten().fieldErrors } satisfies ActionResult;
      }

      const data = resultat.data;
      const eksisterendeYtelser = sak.ytelser;

      sak.kategori = data.kategori;
      sak.misbruktype = data.misbruktype ? [data.misbruktype] : [];
      sak.merking = data.merking || null;
      sak.kilde = data.kilde;
      sak.ytelser = data.ytelser.map((ytelse, indeks) => ({
        id: eksisterendeYtelser[indeks]?.id ?? crypto.randomUUID(),
        type: ytelse,
        periodeFra: data.fraDato,
        periodeTil: data.tilDato,
        belop: data.caBeløp ?? null,
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

function Periodefelter({
  lokaleVerdier,
  feil,
  oppdaterLokaleVerdier,
}: {
  lokaleVerdier: RedigerSaksinformasjonData;
  feil: Feltfeil | undefined;
  oppdaterLokaleVerdier: (felt: keyof RedigerSaksinformasjonData, verdi: string | string[]) => void;
}) {
  const { datepickerProps, fromInputProps, toInputProps } = useRangeDatepicker({
    defaultSelected: {
      from: tilDate(lokaleVerdier.fraDato),
      to: tilDate(lokaleVerdier.tilDato),
    },
  });

  return (
    <DatePicker {...datepickerProps}>
      <HStack gap="space-4" align="start" wrap>
        <DatePicker.Input
          {...fromInputProps}
          size="small"
          name="fraDato"
          label="Fra dato"
          value={lokaleVerdier.fraDato}
          error={feil?.fraDato?.join(", ")}
          onChange={(event) => {
            fromInputProps.onChange?.(event);
            oppdaterLokaleVerdier("fraDato", event.target.value);
          }}
        />

        <DatePicker.Input
          {...toInputProps}
          size="small"
          name="tilDato"
          label="Til dato"
          value={lokaleVerdier.tilDato}
          error={feil?.tilDato?.join(", ")}
          onChange={(event) => {
            toInputProps.onChange?.(event);
            oppdaterLokaleVerdier("tilDato", event.target.value);
          }}
        />
      </HStack>
    </DatePicker>
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
  const ytelseTyper = getYtelseTyper(sak);
  const erAktiv = erAktivSakKontrollsak(sak.status);
  const saksreferanse = getSaksreferanse(sak.id);
  const navn = getNavn(sak);
  const alder = getAlder(sak);
  const kategoriText = getKategoriText(sak);
  const misbrukstyper = getMisbrukstyper(sak);
  const belop = getBelop(sak);
  const periodeText = getPeriodeText(sak);
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
  const utgangspunkt = lagRedigeringsdata(sak);
  const feil: Feltfeil | undefined =
    visFeil && fetcher.data && !fetcher.data.ok ? fetcher.data.feil : undefined;
  const misbrukstypeAlternativer = hentMisbrukstypeAlternativer(lokaleVerdier.kategori);
  const visMisbruktype = misbrukstypeAlternativer.length > 0;
  const harUlagredeEndringer = redigerer && !erLikeRedigeringsdata(lokaleVerdier, utgangspunkt);
  const kanRedigereSaksinformasjon = erAktiv && harStøttetRedigeringsmodell(sak);
  const blocker = useBlocker(harUlagredeEndringer);

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

  function oppdaterLokaleVerdier(felt: keyof RedigerSaksinformasjonData, verdi: string | string[]) {
    setLokaleVerdier((gjeldende) => ({ ...gjeldende, [felt]: verdi }));
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
                    <fetcher.Form method="post">
                      <input type="hidden" name="handling" value="rediger_saksinformasjon" />
                      {lokaleVerdier.ytelser.map((ytelse) => (
                        <input key={ytelse} type="hidden" name="ytelser" value={ytelse} />
                      ))}

                      <VStack gap="space-4">
                        {feil && Object.keys(feil).length > 0 && (
                          <Alert variant="error">
                            {feil.skjema?.[0] ??
                              "Skjemaet inneholder feil. Vennligst rett opp feilene ovenfor."}
                          </Alert>
                        )}

                        <VStack gap="space-1">
                          <Detail className="text-ax-text-neutral-subtle" uppercase>
                            Personnummer
                          </Detail>
                          <HStack gap="space-1" align="center">
                            <BodyShort>{personIdent}</BodyShort>
                            <CopyButton size="xsmall" copyText={personIdent} />
                          </HStack>
                        </VStack>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <VStack gap="space-4">
                            <Select
                              size="small"
                              name="kategori"
                              label="Kategori"
                              value={lokaleVerdier.kategori}
                              error={feil?.kategori?.join(", ")}
                              onChange={(event) => {
                                const kategori = event.target.value;
                                oppdaterLokaleVerdier("kategori", kategori);

                                const gyldigeMisbrukstyper = hentMisbrukstypeAlternativer(kategori);

                                if (
                                  lokaleVerdier.misbruktype &&
                                  !gyldigeMisbrukstyper.includes(
                                    lokaleVerdier.misbruktype as (typeof gyldigeMisbrukstyper)[number],
                                  )
                                ) {
                                  oppdaterLokaleVerdier("misbruktype", "");
                                }
                              }}
                            >
                              <option value="">Velg kategori</option>
                              {kategoriAlternativer.map((kategori) => (
                                <option key={kategori} value={kategori}>
                                  {getKategoriText({ ...sak, kategori }) ?? kategori}
                                </option>
                              ))}
                            </Select>

                            {visMisbruktype && (
                              <Select
                                size="small"
                                name="misbruktype"
                                label="Misbruktype"
                                value={lokaleVerdier.misbruktype}
                                error={feil?.misbruktype?.join(", ")}
                                onChange={(event) =>
                                  oppdaterLokaleVerdier("misbruktype", event.target.value)
                                }
                              >
                                <option value="">Velg misbruktype</option>
                                {misbrukstypeAlternativer.map((type) => (
                                  <option key={type} value={type}>
                                    {type}
                                  </option>
                                ))}
                              </Select>
                            )}

                            <Select
                              size="small"
                              name="merking"
                              label="Merking (valgfritt)"
                              value={lokaleVerdier.merking}
                              error={feil?.merking?.join(", ")}
                              onChange={(event) =>
                                oppdaterLokaleVerdier("merking", event.target.value)
                              }
                            >
                              <option value="">Velg merking</option>
                              {merkingAlternativer.map((merking) => (
                                <option key={merking} value={merking}>
                                  {merkingEtiketter[merking] ?? merking}
                                </option>
                              ))}
                            </Select>

                            <Select
                              size="small"
                              name="kilde"
                              label="Kilde"
                              value={lokaleVerdier.kilde}
                              error={feil?.kilde?.join(", ")}
                              onChange={(event) =>
                                oppdaterLokaleVerdier("kilde", event.target.value)
                              }
                            >
                              <option value="">Velg kilde</option>
                              {kildeAlternativer.map((kilde) => (
                                <option key={kilde} value={kilde}>
                                  {kildeEtiketter[kilde] ?? kilde}
                                </option>
                              ))}
                            </Select>
                          </VStack>

                          <VStack gap="space-4">
                            <Periodefelter
                              key={redigeringsøkt}
                              lokaleVerdier={lokaleVerdier}
                              feil={feil}
                              oppdaterLokaleVerdier={oppdaterLokaleVerdier}
                            />

                            <TextField
                              size="small"
                              name="caBeløp"
                              label="Ca beløp (valgfritt)"
                              inputMode="numeric"
                              value={lokaleVerdier.caBeløp}
                              error={feil?.caBeløp?.join(", ")}
                              onChange={(event) =>
                                oppdaterLokaleVerdier("caBeløp", event.target.value)
                              }
                            />

                            <UNSAFE_Combobox
                              size="small"
                              label="Ytelse"
                              options={ytelser}
                              isMultiSelect
                              selectedOptions={lokaleVerdier.ytelser}
                              error={feil?.ytelser?.join(", ")}
                              onToggleSelected={(option, isSelected) => {
                                const neste = isSelected
                                  ? [...lokaleVerdier.ytelser, option]
                                  : lokaleVerdier.ytelser.filter((ytelse) => ytelse !== option);
                                oppdaterLokaleVerdier("ytelser", neste);
                              }}
                            />
                          </VStack>
                        </div>

                        <HStack justify="end" gap="space-4">
                          <Button size="small" type="submit" loading={fetcher.state !== "idle"}>
                            Lagre
                          </Button>
                          <Button
                            size="small"
                            type="button"
                            variant="secondary"
                            onClick={avbrytRedigering}
                          >
                            Avbryt
                          </Button>
                        </HStack>
                      </VStack>
                    </fetcher.Form>
                  ) : (
                    <VStack gap="space-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

                        <VStack gap="space-4">
                          {periodeText && <Felt label="Periode">{periodeText}</Felt>}

                          <Felt label="Ca beløp">
                            {belop !== null ? formaterBelop(belop) : "–"}
                          </Felt>

                          {ytelseTyper.length > 0 && (
                            <VStack gap="space-1">
                              <Detail className="text-ax-text-neutral-subtle" uppercase>
                                Ytelse
                              </Detail>
                              <HStack gap="space-2" wrap>
                                {ytelseTyper.map((ytelse) => (
                                  <Tag key={ytelse} variant="success" size="small">
                                    {ytelse}
                                  </Tag>
                                ))}
                              </HStack>
                            </VStack>
                          )}
                        </VStack>
                      </div>

                      {erAktiv && (
                        <VStack gap="space-2" align="end">
                          <HStack justify="end">
                            <Button
                              type="button"
                              variant="tertiary"
                              size="xsmall"
                              icon={<PencilIcon aria-hidden />}
                              aria-label="Rediger saksinformasjon"
                              onClick={startRedigering}
                              disabled={!kanRedigereSaksinformasjon}
                            >
                              Rediger
                            </Button>
                          </HStack>
                          {!kanRedigereSaksinformasjon && (
                            <BodyShort size="small" className="text-ax-text-neutral-subtle">
                              Redigering støttes foreløpig bare for saker med én misbrukstype, én
                              merking og én felles periode.
                            </BodyShort>
                          )}
                        </VStack>
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
