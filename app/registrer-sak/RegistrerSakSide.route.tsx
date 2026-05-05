import {
  LocalAlert,
  BodyShort,
  Button,
  DatePicker,
  ErrorSummary,
  FileUpload,
  Heading,
  HStack,
  Loader,
  Page,
  Search,
  Select,
  TextField,
  UNSAFE_Combobox,
  VStack,
  useRangeDatepicker,
} from "@navikt/ds-react";
import { PersonIcon, PlusIcon, TrashIcon } from "@navikt/aksel-icons";
import { PageBlock } from "@navikt/ds-react/Page";
import { useId, useMemo, useState } from "react";
import { Form, Link, useFetcher, useActionData, useLoaderData } from "react-router";
import { RouteConfig } from "~/routeConfig";
import {
  kildeEtiketter,
  merkingEtiketter,
  merkingAlternativer as alleMerkinger,
} from "~/registrer-sak/validering";
import {
  kontrollsakKategoriEtiketter,
  kontrollsakMisbrukstypeEtiketter,
  kontrollsakMisbrukstypeVerdier,
} from "~/saker/kategorier";
import type { PersonOppslagResultat } from "./person-oppslag.mock.server";
import { lagRegistrerSakDatepickerValg } from "./registrerSakDatepicker";
import { action, loader, type SkjemaVerdier, type YtelseRadVerdier } from "./RegistrerSakSide.server";

export { action, loader };

const enhetEtiketter: Record<string, string> = {
  ØST: "Øst",
  VEST: "Vest",
  NORD: "Nord",
  ANALYSE: "Analyse",
};

type Feil = Partial<Record<string, string[]>>;

type YtelseRadState = {
  id: string;
  defaults: YtelseRadVerdier;
};

function nyYtelseRad(defaults: YtelseRadVerdier = {}): YtelseRadState {
  return { id: crypto.randomUUID(), defaults };
}

function førsteFeilForFelt(feil: Feil | undefined, felt: string): string | undefined {
  return feil?.[felt]?.[0];
}

type FeilElement = { id: string; melding: string };

function samleFeilElementer(feil: Feil | undefined): FeilElement[] {
  if (!feil) return [];
  const elementer: FeilElement[] = [];
  for (const [felt, meldinger] of Object.entries(feil)) {
    if (!meldinger || meldinger.length === 0) continue;
    if (felt === "skjema") continue;
    elementer.push({ id: ankerIdForFelt(felt), melding: meldinger[0] });
  }
  return elementer;
}

function ankerIdForFelt(felt: string): string {
  return `felt-${felt.replace(/[^\p{L}\p{N}]+/gu, "-")}`;
}

export default function OpprettSakSide() {
  const { ytelser, kategorier, misbrukstypePerKategori, enheter, kilder } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const feil = actionData && "feil" in actionData ? (actionData.feil as Feil) : undefined;
  const verdier =
    actionData && "verdier" in actionData ? (actionData.verdier as SkjemaVerdier) : undefined;

  const [valgtKategori, setValgtKategori] = useState<string>(verdier?.kategori ?? "");
  const [valgteMisbruktyper, setValgteMisbruktyper] = useState<string[]>(
    verdier?.misbruktype ?? [],
  );
  const [valgteMerkinger, setValgteMerkinger] = useState<string[]>(verdier?.merking ?? []);
  const [søkeFnr, setSøkeFnr] = useState("");
  const [ytelseRader, setYtelseRader] = useState<YtelseRadState[]>(() =>
    verdier && verdier.ytelser.length > 0
      ? verdier.ytelser.map((rad) => nyYtelseRad(rad))
      : [nyYtelseRad()],
  );
  const [filer, setFiler] = useState<File[]>([]);

  const personFetcher = useFetcher<
    PersonOppslagResultat | { person: null; eksisterendeSaker: [] } | { feil: string }
  >();

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

  const åpneSaker = useMemo(
    () => eksisterendeSaker.filter((sak) => !erLukketStatus(sak.status)),
    [eksisterendeSaker],
  );
  const sisteSak = useMemo(() => velgSisteSak(åpneSaker), [åpneSaker]);

  const tilgjengeligeMisbruktyper = useMemo(() => {
    if (!valgtKategori) return kontrollsakMisbrukstypeVerdier;
    const filtrert = (misbrukstypePerKategori as Record<string, string[]>)[valgtKategori];
    return filtrert && filtrert.length > 0
      ? (filtrert as readonly string[])
      : kontrollsakMisbrukstypeVerdier;
  }, [valgtKategori, misbrukstypePerKategori]);

  const feilElementer = samleFeilElementer(feil);
  const errorSummaryId = useId();

  function leggTilYtelseRad() {
    setYtelseRader((rader) => [...rader, nyYtelseRad()]);
  }

  function fjernYtelseRad(id: string) {
    setYtelseRader((rader) =>
      rader.length === 1 ? [nyYtelseRad()] : rader.filter((rad) => rad.id !== id),
    );
  }

  return (
    <Page>
      <title>Opprett sak – Watson Sak</title>
      <PageBlock width="lg" gutters>
        <VStack gap="space-8" className="py-6">
          <Heading level="1" size="large">
            Opprett sak
          </Heading>

          {/* Personoppslag */}
          <personFetcher.Form
            method="post"
            action={RouteConfig.API.PERSON_OPPSLAG}
            aria-label="Søk etter person"
            className="mb-6"
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
              <Search.Button
                type="submit"
                disabled={lasterPerson}
                aria-label={lasterPerson ? "Søker..." : "Søk"}
              >
                {lasterPerson && <Loader size="xsmall" title="Søker..." />}
              </Search.Button>
            </Search>
          </personFetcher.Form>

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
              {/* PersonInfoBanner */}
              <HStack
                gap="space-4"
                align="center"
                className="rounded-lg bg-ax-bg-neutral-moderate px-4 py-3 max-w-2xl"
                aria-label="Personinformasjon"
              >
                <PersonIcon
                  aria-hidden
                  fontSize="1.5rem"
                  className="shrink-0 text-ax-icon-neutral"
                />
                <BodyShort>
                  <strong>{person.navn}</strong>
                  <span className="mx-2 text-ax-text-neutral-subtle">·</span>
                  Personnummer: <strong>{person.personnummer}</strong>
                  <span className="mx-2 text-ax-text-neutral-subtle">·</span>
                  Alder: <strong>{person.alder}</strong>
                </BodyShort>
              </HStack>

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
                    </VStack>
                  </LocalAlert.Content>
                </LocalAlert>
              )}

              {/* Skjema */}
              <Form method="post" aria-label="Grunnleggende saksinformasjon" noValidate>
                <input
                  type="hidden"
                  name="personIdent"
                  value={person.personnummer.replace(/\s/g, "")}
                />
                <VStack gap="space-32">
                  {/* ErrorSummary */}
                  {feilElementer.length > 0 && (
                    <ErrorSummary
                      id={errorSummaryId}
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

                  {feil?.skjema?.[0] && (
                    <LocalAlert status="error" className="max-w-2xl">
                      <LocalAlert.Content>{feil.skjema[0]}</LocalAlert.Content>
                    </LocalAlert>
                  )}

                  <Heading level="2" size="medium">
                    Grunnleggende saksinformasjon
                  </Heading>

                  {/* Rad 1: Kategori, Kilde, Organisasjonsnummer */}
                  <HStack gap="space-24" align="start" wrap>
                    <Select
                      id={ankerIdForFelt("kategori")}
                      name="kategori"
                      label="Kategori"
                      error={førsteFeilForFelt(feil, "kategori")}
                      className="w-52"
                      value={valgtKategori}
                      onChange={(e) => {
                        setValgtKategori(e.target.value);
                        // Nullstill misbruktyper hvis de ikke lenger passer
                        const nyligeGyldige = (misbrukstypePerKategori as Record<string, string[]>)[
                          e.target.value
                        ];
                        if (nyligeGyldige) {
                          setValgteMisbruktyper((prev) =>
                            prev.filter((m) => nyligeGyldige.includes(m)),
                          );
                        }
                      }}
                    >
                      <option value="">Velg kategori</option>
                      {kategorier.map((k) => (
                        <option key={k} value={k}>
                          {kontrollsakKategoriEtiketter[
                            k as keyof typeof kontrollsakKategoriEtiketter
                          ] ?? k}
                        </option>
                      ))}
                    </Select>

                    <Select
                      id={ankerIdForFelt("kilde")}
                      name="kilde"
                      label="Kilde"
                      error={førsteFeilForFelt(feil, "kilde")}
                      className="w-52"
                      defaultValue={verdier?.kilde ?? ""}
                    >
                      <option value="">Velg kilde</option>
                      {kilder.map((k) => (
                        <option key={k} value={k}>
                          {kildeEtiketter[k] ?? k}
                        </option>
                      ))}
                    </Select>

                    <TextField
                      id={ankerIdForFelt("organisasjonsnummer")}
                      name="organisasjonsnummer"
                      label="Organisasjonsnummer (valgfritt)"
                      inputMode="numeric"
                      htmlSize={14}
                      error={førsteFeilForFelt(feil, "organisasjonsnummer")}
                      autoComplete="off"
                      defaultValue={verdier?.organisasjonsnummer ?? ""}
                    />
                  </HStack>

                  {/* Rad 2: Misbruktype, Merking, Enhet */}
                  <HStack gap="space-24" align="start" wrap>
                    <div id={ankerIdForFelt("misbruktype")} className="w-72">
                      <UNSAFE_Combobox
                        label="Misbruktype (valgfritt)"
                        options={tilgjengeligeMisbruktyper.map((verdi) => ({
                          value: verdi,
                          label:
                            kontrollsakMisbrukstypeEtiketter[
                              verdi as keyof typeof kontrollsakMisbrukstypeEtiketter
                            ] ?? verdi,
                        }))}
                        isMultiSelect
                        selectedOptions={valgteMisbruktyper.map((verdi) => ({
                          value: verdi,
                          label:
                            kontrollsakMisbrukstypeEtiketter[
                              verdi as keyof typeof kontrollsakMisbrukstypeEtiketter
                            ] ?? verdi,
                        }))}
                        onToggleSelected={(option, isSelected) => {
                          setValgteMisbruktyper((prev) => {
                            if (isSelected) {
                              return prev.includes(option) ? prev : [...prev, option];
                            }
                            return prev.filter((m) => m !== option);
                          });
                        }}
                        error={førsteFeilForFelt(feil, "misbruktype")}
                      />
                      {valgteMisbruktyper.map((m) => (
                        <input key={m} type="hidden" name="misbruktype" value={m} />
                      ))}
                    </div>

                    <div id={ankerIdForFelt("merking")} className="w-72">
                      <UNSAFE_Combobox
                        label="Merking (valgfritt)"
                        options={alleMerkinger.map((verdi) => ({
                          value: verdi,
                          label: merkingEtiketter[verdi] ?? verdi,
                        }))}
                        isMultiSelect
                        selectedOptions={valgteMerkinger.map((verdi) => ({
                          value: verdi,
                          label: merkingEtiketter[verdi as keyof typeof merkingEtiketter] ?? verdi,
                        }))}
                        onToggleSelected={(option, isSelected) => {
                          setValgteMerkinger((prev) => {
                            if (isSelected) {
                              return prev.includes(option) ? prev : [...prev, option];
                            }
                            return prev.filter((m) => m !== option);
                          });
                        }}
                        error={førsteFeilForFelt(feil, "merking")}
                      />
                      {valgteMerkinger.map((m) => (
                        <input key={m} type="hidden" name="merking" value={m} />
                      ))}
                    </div>

                    <Select
                      id={ankerIdForFelt("enhet")}
                      name="enhet"
                      label="Enhet (valgfritt)"
                      error={førsteFeilForFelt(feil, "enhet")}
                      className="w-44"
                      defaultValue={verdier?.enhet ?? ""}
                    >
                      <option value="">Velg enhet</option>
                      {enheter.map((e) => (
                        <option key={e} value={e}>
                          {enhetEtiketter[e] ?? e}
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
                        Legg til én eller flere ytelser med tilhørende periode og ca beløp. Alle
                        feltene er valgfrie.
                      </BodyShort>
                    </VStack>

                    <VStack gap="space-16">
                      {ytelseRader.map((rad, indeks) => (
                        <YtelseRadFelt
                          key={rad.id}
                          indeks={indeks}
                          ytelser={ytelser}
                          kanFjernes={ytelseRader.length > 1}
                          onFjern={() => fjernYtelseRad(rad.id)}
                          defaults={rad.defaults}
                          feil={feil}
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

                  {/* Filopplaster (kun UI inntil videre) */}
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
            </VStack>
          )}
        </VStack>
      </PageBlock>
    </Page>
  );
}

type YtelseRadFeltProps = {
  indeks: number;
  ytelser: readonly string[];
  kanFjernes: boolean;
  onFjern: () => void;
  defaults: YtelseRadVerdier;
  feil: Feil | undefined;
};

function parseTilDate(verdi: string | undefined): Date | undefined {
  if (!verdi) return undefined;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(verdi);
  if (iso) {
    const dato = new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
    return Number.isNaN(dato.getTime()) ? undefined : dato;
  }
  const norsk = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(verdi);
  if (norsk) {
    const dato = new Date(Date.UTC(Number(norsk[3]), Number(norsk[2]) - 1, Number(norsk[1])));
    return Number.isNaN(dato.getTime()) ? undefined : dato;
  }
  return undefined;
}

function YtelseRadFelt({ indeks, ytelser, kanFjernes, onFjern, defaults, feil }: YtelseRadFeltProps) {
  const [valgtYtelse, setValgtYtelse] = useState<string>(defaults.type ?? "");
  const registrerSakDatepickerValg = useMemo(() => lagRegistrerSakDatepickerValg(new Date()), []);
  const defaultRange = useMemo(
    () => ({
      from: parseTilDate(defaults.fraDato),
      to: parseTilDate(defaults.tilDato),
    }),
    [defaults.fraDato, defaults.tilDato],
  );
  const { datepickerProps, fromInputProps, toInputProps } = useRangeDatepicker({
    ...registrerSakDatepickerValg,
    defaultSelected: defaultRange,
  });

  const ytelseFeltnavn = `ytelser[${indeks}].type`;
  const fraFeltnavn = `ytelser[${indeks}].fraDato`;
  const tilFeltnavn = `ytelser[${indeks}].tilDato`;
  const beløpFeltnavn = `ytelser[${indeks}].beløp`;

  const ytelseFeil = førsteFeilForFelt(feil, `ytelser.${indeks}.type`);
  const fraFeil = førsteFeilForFelt(feil, `ytelser.${indeks}.fraDato`);
  const tilFeil = førsteFeilForFelt(feil, `ytelser.${indeks}.tilDato`);
  const beløpFeil = førsteFeilForFelt(feil, `ytelser.${indeks}.beløp`);

  return (
    <HStack gap="space-16" align="end" wrap>
      <div id={ankerIdForFelt(`ytelser.${indeks}.type`)} className="w-56">
        <UNSAFE_Combobox
          label="Ytelse"
          options={ytelser as string[]}
          selectedOptions={valgtYtelse ? [valgtYtelse] : []}
          onToggleSelected={(option, isSelected) => setValgtYtelse(isSelected ? option : "")}
          error={ytelseFeil}
        />
      </div>
      {valgtYtelse && <input type="hidden" name={ytelseFeltnavn} value={valgtYtelse} />}

      <DatePicker {...datepickerProps} dropdownCaption={registrerSakDatepickerValg.dropdownCaption}>
        <HStack gap="space-16" align="end" wrap>
          <DatePicker.Input
            {...fromInputProps}
            id={ankerIdForFelt(`ytelser.${indeks}.fraDato`)}
            name={fraFeltnavn}
            label="Fra"
            error={fraFeil}
          />
          <DatePicker.Input
            {...toInputProps}
            id={ankerIdForFelt(`ytelser.${indeks}.tilDato`)}
            name={tilFeltnavn}
            label="Til"
            error={tilFeil}
          />
        </HStack>
      </DatePicker>

      <TextField
        id={ankerIdForFelt(`ytelser.${indeks}.beløp`)}
        name={beløpFeltnavn}
        label="Ca beløp"
        inputMode="numeric"
        htmlSize={12}
        autoComplete="off"
        defaultValue={defaults.beløp ?? ""}
        error={beløpFeil}
      />

      <Button
        type="button"
        variant="tertiary"
        size="small"
        icon={<TrashIcon aria-hidden />}
        onClick={onFjern}
        disabled={!kanFjernes}
        title={kanFjernes ? "Fjern rad" : "Det må være minst én rad"}
        className="mb-2"
      >
        <span className="sr-only">Fjern rad {indeks + 1}</span>
      </Button>
    </HStack>
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
