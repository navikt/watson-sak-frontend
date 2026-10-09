import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import {
  Button,
  ErrorSummary,
  Heading,
  HStack,
  LocalAlert,
  Textarea,
  VStack,
} from "@navikt/ds-react";
import { useMemo, useRef, useState, useEffect } from "react";
import {
  Form,
  Link,
  useFetcher,
  useActionData,
  useLoaderData,
  useNavigation,
  useSubmit,
} from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { useInnloggetBrukerValgfri } from "~/auth/innlogget-bruker";
import { FeatureFlagg } from "~/feature-toggling/featureflagg";
import { useEnkeltFeatureFlagg } from "~/feature-toggling/useFeatureFlagg";
import { useKodeverk } from "~/kodeverk/useKodeverk";
import { MiljøtilpassetTittel } from "~/layout/MiljøtilpassetTittel";
import { useMiljø } from "~/miljø/useMiljø";
import { RouteConfig } from "~/routeConfig";
import { opprettSakSchema } from "~/registrer-sak/validering";
import { GrunnleggendeSaksfelter } from "./GrunnleggendeSaksfelter";
import {
  byggOpprettSakSammendrag,
  OpprettSakBekreftelseModal,
  type OpprettSakSammendrag,
} from "./OpprettSakBekreftelseModal";
import type { PersonOppslagResultat } from "./person-oppslag.mock.server";
import { PersonOppslag } from "./PersonOppslag";
import { action, loader } from "./RegistrerSakSide.server";
import type { YtelseRadVerdier } from "./skjema-helpers";
import { Saksvedlegg } from "./Saksvedlegg";
import { lagTilfeldigSak, skalViseTilfeldigSak } from "./tilfeldig-sak";
import { YtelserSkjema, type YtelseRadState } from "./YtelserSkjema";

export { action, loader };

function nyYtelseRad(defaults: YtelseRadVerdier = {}): YtelseRadState {
  return { id: crypto.randomUUID(), defaults };
}

export default function OpprettSakSide() {
  const {
    fnr: forhåndsutfyltFnr,
    legacyPid: loaderLegacyPid,
    legacyKilde: loaderLegacyKilde,
  } = useLoaderData<typeof loader>();
  // Cookien fra migreringslisten er engangs: loaderen sletter den ved første kall. Person-oppslaget
  // (fetcher-POST) revaliderer loaderen, og da er migreringsnøkkelen borte. Uten denne tilstanden
  // forsvinner Notat-feltet og koblingen til kandidaten like etter at personen er funnet.
  const [{ legacyPid, legacyKilde }] = useState({
    legacyPid: loaderLegacyPid,
    legacyKilde: loaderLegacyKilde,
  });
  const innloggetBruker = useInnloggetBrukerValgfri();
  const kodeverk = useKodeverk();
  const miljø = useMiljø();
  const erTilfeldigSakFlaggPåskrudd = useEnkeltFeatureFlagg(FeatureFlagg.TILFELDIG_SAK_I_DEV);
  const lastResult = useActionData<typeof action>();
  const submit = useSubmit();
  const navigation = useNavigation();

  const ytelseAlternativer = useMemo(
    () => kodeverk.ytelseTyper.map((y) => ({ value: y.kode, label: y.beskrivelse })),
    [kodeverk.ytelseTyper],
  );

  // Bekreftelsesmodal for "Opprett sak": vises etter klientvalidering har
  // passert, før skjemaet faktisk sendes til serveren.
  const [modalSteg, setModalSteg] = useState<"lukket" | "bekreft" | "suksess">("lukket");
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [sammendrag, setSammendrag] = useState<OpprettSakSammendrag | null>(null);
  const innsendingPågår = useRef(false);
  const forrigeNavigasjonstilstand = useRef(navigation.state);
  const senderInn = navigation.state !== "idle" && innsendingPågår.current;

  // Fra migreringslisten forhåndsutfylles enheten med innlogget brukers egen enhet (Figma, skjerm 2).
  const egenEnhet =
    legacyPid && legacyKilde && kodeverk.enheter.some((e) => e.kode === innloggetBruker?.enhetId)
      ? (innloggetBruker?.enhetId ?? "")
      : "";

  // Select-feltene er ukontrollerte og eies av Conform. Kontrollerte felt ble tilbakestilt
  // når revalideringen på input-eventet rendret på nytt før React rakk å lese change-eventet.
  const [form, fields] = useForm({
    id: "opprett-sak",
    lastResult: lastResult && "status" in lastResult ? lastResult : undefined,
    defaultValue: { enhet: egenEnhet },
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: opprettSakSchema });
    },
    shouldValidate: "onSubmit",
    shouldRevalidate: "onInput",
  });

  const valgtKategori = fields.kategori.value ?? "";

  const [valgteMisbruktyper, setValgteMisbruktyper] = useState<string[]>(
    (fields.misbruktype.initialValue as string[]) ?? [],
  );
  const [valgteMerkinger, setValgteMerkinger] = useState<string[]>(
    (fields.merking.initialValue as string[]) ?? [],
  );
  const [valgteArbeidsgivere, setValgteArbeidsgivere] = useState<string[]>(
    (fields.arbeidsgivere.initialValue as string[]) ?? [],
  );
  const [søkeFnr, setSøkeFnr] = useState(forhåndsutfyltFnr ?? "");
  const [ytelseRader, setYtelseRader] = useState<YtelseRadState[]>(() => {
    const initial = fields.ytelser.initialValue;
    if (Array.isArray(initial) && initial.length > 0) {
      return initial.map((rad) => nyYtelseRad(rad as YtelseRadVerdier));
    }
    return [nyYtelseRad()];
  });
  const [filer, setFiler] = useState<File[]>([]);

  const personFetcher = useFetcher<
    PersonOppslagResultat | { person: null; eksisterendeSaker: [] } | { feil: string }
  >();

  useEffect(() => {
    if (!forhåndsutfyltFnr) return;
    const formData = new FormData();
    formData.set("fnr", forhåndsutfyltFnr);
    personFetcher.submit(formData, {
      method: "post",
      action: RouteConfig.API.PERSON_OPPSLAG,
    });
    // Kjøres kun én gang ved mount — forhåndsutfyltFnr er en server-rendert verdi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const harSøkt = personFetcher.state === "idle" && personFetcher.data !== undefined;
  const lasterPerson = personFetcher.state !== "idle";
  const oppslagFeil =
    personFetcher.data && "feil" in personFetcher.data ? personFetcher.data.feil : null;
  const person =
    personFetcher.data && "person" in personFetcher.data ? personFetcher.data.person : null;
  const eksisterendeSaker =
    personFetcher.data && "eksisterendeSaker" in personFetcher.data
      ? personFetcher.data.eksisterendeSaker
      : [];
  const søktMedHistoriskIdent =
    personFetcher.data && "søktMedHistoriskIdent" in personFetcher.data
      ? personFetcher.data.søktMedHistoriskIdent
      : false;
  // Skjermet person der saksbehandler mangler Utvidet tilgang: sperr skjemaet proaktivt
  // i stedet for å la saksbehandler fylle det ut og først få avvist ved innsending.
  const skjemaSperret = Boolean(person?.adresseskjermet) && person?.kanOppretteSak === false;

  const åpneSaker = useMemo(
    () => eksisterendeSaker.filter((sak) => !erLukketStatus(sak.status)),
    [eksisterendeSaker],
  );
  const sisteSak = useMemo(() => velgSisteSak(åpneSaker), [åpneSaker]);

  const tilgjengeligeMisbruktyper = useMemo(() => {
    if (!valgtKategori) return [];
    return kodeverk.misbrukstyper.filter((m) => m.kategori === valgtKategori).map((m) => m.kode);
  }, [valgtKategori, kodeverk.misbrukstyper]);

  const misbrukstypeBeskrivelseMap = useMemo(
    () => new Map(kodeverk.misbrukstyper.map((m) => [m.kode, m.beskrivelse])),
    [kodeverk.misbrukstyper],
  );

  const ytelseLabelMap = useMemo(
    () => new Map(ytelseAlternativer.map((y) => [y.value, y.label])),
    [ytelseAlternativer],
  );

  const suksessSakId = lastResult && "ok" in lastResult && lastResult.ok ? lastResult.sakId : null;

  // Følger overgangen fra innsending (navigation.state !== "idle") til ferdig,
  // slik at bekreftelsesmodalen kan bytte til suksess-steget — eller lukkes
  // igjen dersom serveren avviste innsendingen.
  useEffect(() => {
    const varUnderveis = forrigeNavigasjonstilstand.current !== "idle";
    const erFerdigNå = navigation.state === "idle";
    if (varUnderveis && erFerdigNå && innsendingPågår.current) {
      innsendingPågår.current = false;
      if (lastResult && "ok" in lastResult && lastResult.ok) {
        setModalSteg("suksess");
        sporHendelse("sak opprettet", { kategori: valgtKategori });
      } else {
        setModalSteg("lukket");
        setPendingFormData(null);
      }
    }
    forrigeNavigasjonstilstand.current = navigation.state;
  }, [navigation.state, lastResult, valgtKategori]);

  const feilElementer = useMemo(() => {
    const elementer: Array<{ id: string; melding: string }> = [];
    for (const [navn, feil] of Object.entries(form.allErrors)) {
      if (navn === "" || !feil || feil.length === 0) continue;
      const id =
        fields[navn as keyof typeof fields]?.id ?? `felt-${navn.replace(/[^\p{L}\p{N}]+/gu, "-")}`;
      elementer.push({ id, melding: feil[0] });
    }
    return elementer;
  }, [form.allErrors, fields]);

  function leggTilYtelseRad() {
    setYtelseRader((rader) => [...rader, nyYtelseRad()]);
  }

  function fjernYtelseRad(id: string) {
    setYtelseRader((rader) =>
      rader.length === 1 ? [nyYtelseRad()] : rader.filter((rad) => rad.id !== id),
    );
  }

  function fyllUtTilfeldigSak() {
    const tilfeldigSak = lagTilfeldigSak(kodeverk);
    if (!tilfeldigSak) return;

    form.update({ name: fields.kategori.name, value: tilfeldigSak.kategori });
    form.update({ name: fields.kilde.name, value: tilfeldigSak.kilde });
    form.update({ name: fields.enhet.name, value: tilfeldigSak.enhet });
    setValgteMisbruktyper(tilfeldigSak.misbruktyper);
    setValgteMerkinger(tilfeldigSak.merkinger);
    setValgteArbeidsgivere([]);
    setYtelseRader(tilfeldigSak.ytelser.map((ytelse) => nyYtelseRad(ytelse)));
  }

  function håndterBekreftOpprettelse() {
    if (!pendingFormData) return;
    sporHendelse("opprett sak bekreftet", { kategori: valgtKategori });
    innsendingPågår.current = true;
    submit(pendingFormData, { method: "post", encType: "multipart/form-data" });
  }

  function håndterLukkBekreftelsesmodal() {
    if (modalSteg === "bekreft") {
      sporHendelse("opprett sak avbrutt i bekreftelse");
    }
    setModalSteg("lukket");
    setPendingFormData(null);
  }

  function håndterOpprettNySak() {
    sporHendelse("opprett sak skjema nullstilt");
    // Full sidenavigasjon nullstiller all klientstate (personsøk, skjemafelt,
    // opplastede filer osv.) på en enkel og robust måte.
    window.location.assign(RouteConfig.REGISTRER_SAK);
  }

  return (
    <>
      <MiljøtilpassetTittel>Opprett sak – Watson Sak</MiljøtilpassetTittel>
      <VStack gap="space-12" className="mt-4 mb-8">
        <Heading level="1" size="large">
          Opprett sak
        </Heading>

        <PersonOppslag
          personFetcher={personFetcher}
          søkeFnr={søkeFnr}
          setSøkeFnr={setSøkeFnr}
          lasterPerson={lasterPerson}
          harSøkt={harSøkt}
          oppslagFeil={oppslagFeil}
          person={person}
          søktMedHistoriskIdent={søktMedHistoriskIdent}
          legacyPid={legacyPid ?? undefined}
          skjemaSperret={skjemaSperret}
          sisteSak={sisteSak}
          formaterDato={formaterDato}
          onPersonOppslag={() => sporHendelse("person oppslag")}
        >
          {person && !skjemaSperret && (
            <Form
              method="post"
              aria-label="Grunnleggende saksinformasjon"
              id={form.id}
              onSubmit={(event) => {
                form.onSubmit(event);
                if (!event.defaultPrevented) {
                  event.preventDefault();
                  const formData = new FormData(event.currentTarget);
                  filer.forEach((fil) => formData.append("filer", fil));
                  setPendingFormData(formData);
                  setSammendrag(
                    byggOpprettSakSammendrag(
                      formData,
                      kodeverk,
                      ytelseLabelMap,
                      misbrukstypeBeskrivelseMap,
                    ),
                  );
                  setModalSteg("bekreft");
                  sporHendelse("opprett sak bekreftelse vist");
                }
              }}
              noValidate
            >
              <input
                type="hidden"
                name="personIdent"
                value={person.personnummer.replace(/\s/g, "")}
              />
              {legacyPid && legacyKilde && (
                <>
                  <input type="hidden" name="legacyPid" value={legacyPid} />
                  <input type="hidden" name="legacyKilde" value={legacyKilde} />
                </>
              )}
              <VStack gap="space-32">
                {/* ErrorSummary */}
                {feilElementer.length > 0 && (
                  <ErrorSummary
                    heading="Du må rette disse feilene før du kan gå videre"
                    className="max-w-2xl"
                  >
                    {feilElementer.map((f) => (
                      <ErrorSummary.Item key={f.id} href={`#${f.id}`}>
                        {f.melding}
                      </ErrorSummary.Item>
                    ))}
                  </ErrorSummary>
                )}

                {form.errors && form.errors.length > 0 && (
                  <LocalAlert status="error" className="max-w-2xl">
                    <LocalAlert.Content>{form.errors[0]}</LocalAlert.Content>
                  </LocalAlert>
                )}

                <Heading level="2" size="medium">
                  Grunnleggende saksinformasjon
                </Heading>

                {skalViseTilfeldigSak(miljø, erTilfeldigSakFlaggPåskrudd) && (
                  <HStack>
                    <Button type="button" variant="secondary" onClick={fyllUtTilfeldigSak}>
                      Fyll ut en tilfeldig sak
                    </Button>
                  </HStack>
                )}

                <GrunnleggendeSaksfelter
                  fields={fields}
                  kodeverk={kodeverk}
                  tilgjengeligeMisbruktyper={tilgjengeligeMisbruktyper}
                  misbrukstypeBeskrivelseMap={misbrukstypeBeskrivelseMap}
                  valgteMisbruktyper={valgteMisbruktyper}
                  setValgteMisbruktyper={setValgteMisbruktyper}
                  valgteMerkinger={valgteMerkinger}
                  setValgteMerkinger={setValgteMerkinger}
                  valgteArbeidsgivere={valgteArbeidsgivere}
                  setValgteArbeidsgivere={setValgteArbeidsgivere}
                />
                <hr className="border-ax-border-neutral-subtle max-w-2xl" />

                <YtelserSkjema
                  ytelseRader={ytelseRader}
                  ytelseAlternativer={ytelseAlternativer}
                  feil={form.allErrors}
                  onFjern={fjernYtelseRad}
                  onLeggTil={leggTilYtelseRad}
                />

                <hr className="border-ax-border-neutral-subtle max-w-2xl" />

                <Saksvedlegg filer={filer} setFiler={setFiler} />

                {legacyPid && legacyKilde && (
                  <Textarea
                    key={fields.notat.key}
                    name={fields.notat.name}
                    id={fields.notat.id}
                    label="Notat"
                    description="Åpent notatfelt – lagres som eget notat på saken ved opprettelse"
                    className="max-w-2xl"
                    defaultValue={fields.notat.initialValue}
                    error={fields.notat.errors?.[0]}
                  />
                )}

                {/* Submit-rad */}
                <HStack gap="space-12" justify="end">
                  <Button as={Link} to={RouteConfig.INDEX} variant="tertiary">
                    Avbryt
                  </Button>
                  <Button type="submit" variant="primary">
                    Opprett sak
                  </Button>
                </HStack>
              </VStack>
            </Form>
          )}
        </PersonOppslag>
      </VStack>

      {person && (
        <OpprettSakBekreftelseModal
          steg={modalSteg === "suksess" ? "suksess" : "bekreft"}
          åpen={modalSteg !== "lukket"}
          onClose={håndterLukkBekreftelsesmodal}
          personNavn={person.navn}
          personnummer={person.personnummer}
          alder={person.alder}
          sammendrag={sammendrag}
          senderInn={senderInn}
          onBekreft={håndterBekreftOpprettelse}
          onAvbryt={håndterLukkBekreftelsesmodal}
          sakId={suksessSakId}
          onOpprettNySak={håndterOpprettNySak}
        />
      )}
    </>
  );
}

function formaterDato(iso: string): string {
  return new Date(iso).toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function erLukketStatus(status: string): boolean {
  const lukket = ["AVSLUTTET", "Avsluttet", "LUKKET", "Lukket"];
  return lukket.includes(status);
}

function velgSisteSak<T extends { opprettetDato: string }>(saker: readonly T[]): T | undefined {
  if (saker.length === 0) return undefined;
  return [...saker].sort((a, b) =>
    a.opprettetDato < b.opprettetDato ? 1 : a.opprettetDato > b.opprettetDato ? -1 : 0,
  )[0];
}
