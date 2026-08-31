import { useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import {
  LocalAlert,
  BodyShort,
  Button,
  ErrorSummary,
  FileUpload,
  Heading,
  HStack,
  Loader,
  Search,
  Select,
  UNSAFE_Combobox,
  VStack,
} from "@navikt/ds-react";
import { MagnifyingGlassIcon, PersonIcon, PlusIcon } from "@navikt/aksel-icons";
import { useMemo, useState, useEffect } from "react";
import { Form, Link, useFetcher, useActionData, useLoaderData, useSubmit } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { useKodeverk } from "~/kodeverk/useKodeverk";
import { MiljøtilpassetTittel } from "~/layout/MiljøtilpassetTittel";
import { RouteConfig } from "~/routeConfig";
import { opprettSakSchema } from "~/registrer-sak/validering";
import { merkingEtikett } from "~/saker/kategorier";
import { INGEN_TILGANG_TIL_Å_OPPRETTE_SAK_MELDING } from "./feilmeldinger";
import type { PersonOppslagResultat } from "./person-oppslag.mock.server";
import { action, loader } from "./RegistrerSakSide.server";
import type { YtelseRadVerdier } from "./skjema-helpers";
import { YtelseRadFelt } from "./YtelseRadFelt";

export { action, loader };

type YtelseRadState = {
  id: string;
  defaults: YtelseRadVerdier;
};

function nyYtelseRad(defaults: YtelseRadVerdier = {}): YtelseRadState {
  return { id: crypto.randomUUID(), defaults };
}

function PersonkortIkon() {
  return (
    <svg
      aria-hidden
      className="shrink-0"
      fill="none"
      focusable="false"
      height="24"
      viewBox="0 0 24 24"
      width="24"
    >
      <circle cx="12" cy="12" fill="#3386e0" r="12" />
      <path
        d="M4.06152 3.30859L4.96387 3.31543C6.21626 3.38517 7.57007 4.3105 7.57031 5.58008C7.56956 5.63708 7.56934 5.81577 7.56934 5.84277V9.89258C7.56909 10.219 7.27804 10.4824 6.91895 10.4824C6.55964 10.4822 6.2688 10.2189 6.26855 9.89258V6.53516C6.26835 6.38308 6.14468 6.25977 5.99219 6.25977C5.84643 6.25983 5.72992 6.37347 5.71973 6.5166C5.71785 6.52373 5.71191 6.52863 5.71191 6.53613V17.2109C5.71191 17.668 5.34247 18.0381 4.88574 18.0381C4.42899 18.0381 4.05762 17.6677 4.05762 17.2109V10.4434C4.05759 10.2935 3.93605 10.1715 3.78516 10.1709C3.63367 10.1709 3.51175 10.2934 3.51172 10.4434V17.2109C3.51157 17.6679 3.14063 18.0381 2.68359 18.0381C2.22698 18.038 1.85757 17.6675 1.85742 17.2109V6.53516C1.85722 6.52796 1.85118 6.52311 1.84961 6.5166C1.83949 6.37338 1.72299 6.25883 1.57715 6.25879C1.4249 6.25879 1.30079 6.38253 1.30078 6.53516V9.8916C1.30078 10.2181 1.00987 10.4823 0.650391 10.4824C0.290766 10.4824 0 10.2182 0 9.8916V5.58008C0.000238766 4.3105 1.35368 3.38555 2.60645 3.31543L3.50879 3.30859V3.30566L3.78516 3.30762L4.06152 3.30566V3.30859ZM3.78418 0C4.58617 0 5.23806 0.649835 5.23828 1.45215C5.23828 2.25465 4.58593 2.90527 3.78418 2.90527C2.98212 2.9052 2.33203 2.25423 2.33203 1.45215C2.33225 0.650255 2.98225 7.3021e-05 3.78418 0Z"
        fill="white"
        transform="translate(8.215 2.981)"
      />
    </svg>
  );
}

export default function OpprettSakSide() {
  const { fnr: forhåndsutfyltFnr } = useLoaderData<typeof loader>();
  const kodeverk = useKodeverk();
  const lastResult = useActionData<typeof action>();
  const submit = useSubmit();

  const ytelseAlternativer = useMemo(
    () => kodeverk.ytelseTyper.map((y) => ({ value: y.kode, label: y.beskrivelse })),
    [kodeverk.ytelseTyper],
  );

  const [form, fields] = useForm({
    id: "opprett-sak",
    lastResult: lastResult && "status" in lastResult ? lastResult : undefined,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: opprettSakSchema });
    },
    shouldValidate: "onSubmit",
    shouldRevalidate: "onInput",
  });

  const [valgtKategori, setValgtKategori] = useState(fields.kategori.initialValue ?? "");

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

  return (
    <>
      <MiljøtilpassetTittel>Opprett sak – Watson Sak</MiljøtilpassetTittel>
      <VStack gap="space-12" className="mt-4 mb-8">
        <Heading level="1" size="large">
          Opprett sak
        </Heading>

        {/* Personoppslag */}
        <personFetcher.Form
          method="post"
          action={RouteConfig.API.PERSON_OPPSLAG}
          aria-label="Søk etter person"
          className="mb-6"
          onSubmit={() => sporHendelse("person oppslag")}
        >
          <Search
            label="Fødsels- eller d-nummer"
            hideLabel={false}
            name="fnr"
            value={søkeFnr}
            onChange={setSøkeFnr}
            onClear={() => setSøkeFnr("")}
            htmlSize={20}
            autoComplete="off"
            inputMode="numeric"
            disabled={lasterPerson}
          >
            <Button
              type="submit"
              variant="primary"
              size="medium"
              disabled={lasterPerson}
              aria-label={lasterPerson ? "Søker..." : "Søk"}
              icon={
                lasterPerson ? (
                  <Loader size="xsmall" title="Søker..." />
                ) : (
                  <MagnifyingGlassIcon aria-hidden />
                )
              }
              className="aksel-search__button-search"
            />
          </Search>
        </personFetcher.Form>

        {/* Historisk ident brukt i søket — saken opprettes likevel på gjeldende ident */}
        {harSøkt && person && søktMedHistoriskIdent && (
          <LocalAlert status="announcement" className="max-w-xl">
            <LocalAlert.Header>
              <LocalAlert.Title as="h2">
                Personnummeret/D-nummeret er ikke lenger gjeldende
              </LocalAlert.Title>
            </LocalAlert.Header>
            <LocalAlert.Content>
              Personnummeret eller D-nummeret du søkte med er ikke lenger gjeldende. Saken opprettes
              på personens nåværende identifikator: <strong>{person.personnummer}</strong>.
            </LocalAlert.Content>
          </LocalAlert>
        )}

        {/* Feil fra personoppslag */}
        {harSøkt && oppslagFeil && (
          <LocalAlert status="announcement" className="max-w-xl">
            <LocalAlert.Header>
              <LocalAlert.Title as="h2">Feil ved personoppslag</LocalAlert.Title>
            </LocalAlert.Header>
            <LocalAlert.Content>{oppslagFeil}</LocalAlert.Content>
          </LocalAlert>
        )}

        {/* Person ikke funnet */}
        {harSøkt && !person && !oppslagFeil && (
          <LocalAlert status="announcement" className="max-w-xl">
            <LocalAlert.Header>
              <LocalAlert.Title as="h2">Personen ble ikke funnet</LocalAlert.Title>
            </LocalAlert.Header>
            <LocalAlert.Content>Sjekk at fødselsnummeret er riktig.</LocalAlert.Content>
          </LocalAlert>
        )}

        {/* Person funnet */}
        {person && (
          <VStack gap="space-32">
            <VStack gap="space-4">
              <HStack
                align="center"
                aria-label="Personinformasjon"
                className="max-w-[472px] rounded-lg border-l-4 border-[#005299] bg-ax-bg-info-soft px-6 py-3.5"
                gap="space-16"
              >
                <PersonkortIkon />
                <VStack gap="space-0">
                  <span className="text-[11px] font-semibold tracking-[0.6px] text-[#476b8c]">
                    SAKEN OPPRETTES PÅ
                  </span>
                  <BodyShort size="medium" className="font-bold">
                    {person.navn}
                  </BodyShort>
                  <BodyShort size="small" className="text-[#5c5c5c]">
                    Personnummer: {person.personnummer} · {person.alder} år
                  </BodyShort>
                </VStack>
              </HStack>
              {person.adresseskjermet && (
                <LocalAlert status="error" className="max-w-2xl">
                  <LocalAlert.Content>Denne personen er skjermet.</LocalAlert.Content>
                </LocalAlert>
              )}
            </VStack>

            {/* Skjema sperret: saksbehandler mangler Utvidet tilgang til skjermet person.
                Skjemaet rendres bevisst ikke i det hele tatt — se RAILS-9. */}
            {skjemaSperret && (
              <LocalAlert status="warning" className="max-w-2xl">
                <LocalAlert.Header>
                  <LocalAlert.Title as="h2">
                    Du kan ikke opprette sak på denne personen
                  </LocalAlert.Title>
                </LocalAlert.Header>
                <LocalAlert.Content>
                  {INGEN_TILGANG_TIL_Å_OPPRETTE_SAK_MELDING}. Ta kontakt dersom du mener dette er
                  feil.
                </LocalAlert.Content>
              </LocalAlert>
            )}

            {/* Eksisterende sak-advarsel (info, ikke-blokkerende) */}
            {sisteSak && (
              <LocalAlert status="announcement" className="max-w-2xl">
                <LocalAlert.Header>
                  <LocalAlert.Title as="h2">
                    Det er allerede registrert en sak på personen
                  </LocalAlert.Title>
                </LocalAlert.Header>
                <LocalAlert.Content>
                  <VStack gap="space-12">
                    <BodyShort>
                      {formaterDato(sisteSak.opprettetDato)} ble det opprettet en sak på{" "}
                      {sisteSak.personNavn}. Kanskje gjelder dette samme sak?
                    </BodyShort>
                    {sisteSak.sakId ? (
                      <HStack gap="space-8">
                        <Button
                          as={Link}
                          to={RouteConfig.SAKER_DETALJ.replace(":sakId", sisteSak.sakId)}
                          variant="secondary"
                          size="small"
                        >
                          Se sak
                        </Button>
                      </HStack>
                    ) : null}
                  </VStack>
                </LocalAlert.Content>
              </LocalAlert>
            )}

            {/* Skjema — rendres kun når saksbehandler har rett til å opprette sak.
                For skjermet person uten Utvidet tilgang sperres skjemaet proaktivt
                ved at det ikke rendres i det hele tatt, se RAILS-9. */}
            {!skjemaSperret && (
              <Form
                method="post"
                aria-label="Grunnleggende saksinformasjon"
                id={form.id}
                onSubmit={(event) => {
                  form.onSubmit(event);
                  if (!event.defaultPrevented) {
                    event.preventDefault();
                    sporHendelse("sak opprettet", { kategori: valgtKategori });
                    const formData = new FormData(event.currentTarget);
                    filer.forEach((fil) => formData.append("filer", fil));
                    submit(formData, { method: "post", encType: "multipart/form-data" });
                  }
                }}
                noValidate
              >
                <input
                  type="hidden"
                  name="personIdent"
                  value={person.personnummer.replace(/\s/g, "")}
                />
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

                  {/* Rad 1: Kategori, Misbruktype, Merking */}
                  <HStack gap="space-24" align="start" wrap>
                    <Select
                      name={fields.kategori.name}
                      id={fields.kategori.id}
                      label="Kategori"
                      error={fields.kategori.errors?.[0]}
                      className="w-52"
                      value={valgtKategori}
                      onChange={(e) => {
                        setValgtKategori(e.target.value);
                        const nyligeGyldige = kodeverk.misbrukstyper
                          .filter((m) => m.kategori === e.target.value)
                          .map((m) => m.kode);
                        if (nyligeGyldige && nyligeGyldige.length > 0) {
                          setValgteMisbruktyper((prev) =>
                            prev.filter((m) => nyligeGyldige.includes(m)),
                          );
                        } else {
                          setValgteMisbruktyper([]);
                        }
                      }}
                    >
                      <option value="">Velg kategori</option>
                      {kodeverk.kategorier.map((k) => (
                        <option key={k.kode} value={k.kode}>
                          {k.beskrivelse}
                        </option>
                      ))}
                    </Select>

                    <div id={fields.misbruktype.id} className="w-72">
                      <UNSAFE_Combobox
                        label="Misbruktype"
                        options={tilgjengeligeMisbruktyper.map((kode) => ({
                          value: kode,
                          label: misbrukstypeBeskrivelseMap.get(kode) ?? kode,
                        }))}
                        isMultiSelect
                        disabled={tilgjengeligeMisbruktyper.length === 0}
                        selectedOptions={valgteMisbruktyper.map((kode) => ({
                          value: kode,
                          label: misbrukstypeBeskrivelseMap.get(kode) ?? kode,
                        }))}
                        onToggleSelected={(option, isSelected) => {
                          setValgteMisbruktyper((prev) => {
                            if (isSelected) {
                              return prev.includes(option) ? prev : [...prev, option];
                            }
                            return prev.filter((m) => m !== option);
                          });
                        }}
                        error={fields.misbruktype.errors?.[0]}
                      />
                      {valgteMisbruktyper.map((m) => (
                        <input key={m} type="hidden" name="misbruktype" value={m} />
                      ))}
                    </div>

                    <div id={fields.merking.id} className="w-72">
                      <UNSAFE_Combobox
                        label="Merking (valgfritt)"
                        options={kodeverk.merker.map((merke) => ({
                          value: merke,
                          label: merkingEtikett(merke),
                        }))}
                        isMultiSelect
                        allowNewValues
                        selectedOptions={valgteMerkinger.map((merke) => ({
                          value: merke,
                          label: merkingEtikett(merke),
                        }))}
                        onToggleSelected={(option, isSelected) => {
                          setValgteMerkinger((prev) => {
                            if (isSelected) {
                              return prev.includes(option) ? prev : [...prev, option];
                            }
                            return prev.filter((m) => m !== option);
                          });
                        }}
                        error={fields.merking.errors?.[0]}
                      />
                      {valgteMerkinger.map((m) => (
                        <input key={m} type="hidden" name="merking" value={m} />
                      ))}
                    </div>
                  </HStack>

                  {/* Rad 2: Kilde, Organisasjonsnummer, Enhet */}
                  <HStack gap="space-24" align="start" wrap>
                    <Select
                      name={fields.kilde.name}
                      id={fields.kilde.id}
                      label="Kilde"
                      error={fields.kilde.errors?.[0]}
                      className="w-52"
                      defaultValue={fields.kilde.initialValue ?? ""}
                    >
                      <option value="">Velg kilde</option>
                      {kodeverk.kilder.map((k) => (
                        <option key={k.kode} value={k.kode}>
                          {k.beskrivelse}
                        </option>
                      ))}
                    </Select>

                    <div>
                      <UNSAFE_Combobox
                        id={fields.arbeidsgivere.id}
                        label="Organisasjonsnummer (valgfritt)"
                        isMultiSelect
                        allowNewValues
                        options={[]}
                        selectedOptions={valgteArbeidsgivere.map((orgnr) => ({
                          label: orgnr,
                          value: orgnr,
                        }))}
                        onToggleSelected={(option, isSelected) => {
                          setValgteArbeidsgivere((prev) => {
                            if (isSelected && !prev.includes(option)) {
                              return [...prev, option];
                            }
                            if (!isSelected) {
                              return prev.filter((v) => v !== option);
                            }
                            return prev;
                          });
                        }}
                        error={fields.arbeidsgivere.errors?.[0]}
                      />
                      {valgteArbeidsgivere.map((orgnr) => (
                        <input key={orgnr} type="hidden" name="arbeidsgivere" value={orgnr} />
                      ))}
                    </div>

                    <Select
                      name={fields.enhet.name}
                      id={fields.enhet.id}
                      label="Enhet (valgfritt)"
                      error={fields.enhet.errors?.[0]}
                      className="w-44"
                      defaultValue={(fields.enhet.initialValue ?? "") as string}
                    >
                      <option value="">Velg enhet</option>
                      {kodeverk.enheter.map((e) => (
                        <option key={e.kode} value={e.kode}>
                          {e.beskrivelse}
                        </option>
                      ))}
                    </Select>
                  </HStack>

                  <hr className="border-ax-border-neutral-subtle max-w-2xl" />

                  {/* Ytelser */}
                  <VStack gap="space-16">
                    <VStack gap="space-4">
                      <Heading level="2" size="medium">
                        Ytelser med mulig misbruk
                      </Heading>
                      <BodyShort textColor="subtle">
                        Legg til én eller flere ytelser med tilhørende periode og beløp. Alle
                        feltene er valgfrie.
                      </BodyShort>
                    </VStack>

                    <VStack gap="space-16">
                      {ytelseRader.map((rad, indeks) => (
                        <YtelseRadFelt
                          key={rad.id}
                          indeks={indeks}
                          ytelser={ytelseAlternativer}
                          kanFjernes={ytelseRader.length > 1}
                          onFjern={() => fjernYtelseRad(rad.id)}
                          defaults={rad.defaults}
                          feil={form.allErrors}
                          visEndeligBeløp={false}
                        />
                      ))}
                    </VStack>

                    <HStack>
                      <Button
                        type="button"
                        variant="tertiary"
                        size="small"
                        icon={<PlusIcon aria-hidden />}
                        onClick={leggTilYtelseRad}
                      >
                        Legg til ytelse
                      </Button>
                    </HStack>
                  </VStack>

                  <hr className="border-ax-border-neutral-subtle max-w-2xl" />

                  {/* Filopplasting */}
                  <VStack gap="space-12" className="max-w-2xl">
                    <FileUpload.Dropzone
                      label="Last opp dokumenter (valgfritt)"
                      description="Legg ved filer som dokumenterer saken. Maks 50 MB per fil."
                      accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
                      onSelect={(_, partitioned) =>
                        setFiler((eksisterende) => [...eksisterende, ...partitioned.accepted])
                      }
                    />
                    {filer.length > 0 && (
                      <VStack gap="space-4" as="ul" aria-label="Opplastede filer">
                        {filer.map((fil, indeks) => (
                          <FileUpload.Item
                            key={`${fil.name}-${indeks}`}
                            as="li"
                            file={fil}
                            button={{
                              action: "delete",
                              onClick: () =>
                                setFiler((eksisterende) =>
                                  eksisterende.filter((_, i) => i !== indeks),
                                ),
                            }}
                          />
                        ))}
                      </VStack>
                    )}
                  </VStack>

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
          </VStack>
        )}
      </VStack>
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
  const lukket = ["AVSLUTTET", "Avsluttet", "LUKKET", "Lukket", "HENLAGT", "Henlagt"];
  return lukket.includes(status);
}

function velgSisteSak<T extends { opprettetDato: string }>(saker: readonly T[]): T | undefined {
  if (saker.length === 0) return undefined;
  return [...saker].sort((a, b) =>
    a.opprettetDato < b.opprettetDato ? 1 : a.opprettetDato > b.opprettetDato ? -1 : 0,
  )[0];
}
