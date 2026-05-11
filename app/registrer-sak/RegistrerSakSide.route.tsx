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
  Page,
  Search,
  Select,
  TextField,
  UNSAFE_Combobox,
  VStack,
} from "@navikt/ds-react";
import { PersonIcon, PlusIcon } from "@navikt/aksel-icons";
import { PageBlock } from "@navikt/ds-react/Page";
import { useMemo, useState } from "react";
import { Form, Link, useFetcher, useActionData, useLoaderData } from "react-router";
import { RouteConfig } from "~/routeConfig";
import {
  kildeEtiketter,
  merkingEtiketter,
  merkingAlternativer as alleMerkinger,
  enhetEtiketter,
  opprettSakSchema,
} from "~/registrer-sak/validering";
import { kontrollsakKategoriEtiketter, kontrollsakMisbrukstypeEtiketter } from "~/saker/kategorier";
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

export default function OpprettSakSide() {
  const { ytelser, kategorier, misbrukstypePerKategori, enheter, kilder } =
    useLoaderData<typeof loader>();
  const lastResult = useActionData<typeof action>();

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
  const [søkeFnr, setSøkeFnr] = useState("");
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
    if (!valgtKategori) return [];
    const filtrert = (misbrukstypePerKategori as Record<string, string[]>)[valgtKategori];
    return filtrert && filtrert.length > 0 ? (filtrert as readonly string[]) : [];
  }, [valgtKategori, misbrukstypePerKategori]);

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

              {/* Skjema */}
              <Form
                method="post"
                aria-label="Grunnleggende saksinformasjon"
                id={form.id}
                onSubmit={form.onSubmit}
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

                  {/* Rad 1: Kategori, Kilde, Organisasjonsnummer */}
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
                        const nyligeGyldige = (misbrukstypePerKategori as Record<string, string[]>)[
                          e.target.value
                        ];
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
                      {kategorier.map((k) => (
                        <option key={k} value={k}>
                          {kontrollsakKategoriEtiketter[
                            k as keyof typeof kontrollsakKategoriEtiketter
                          ] ?? k}
                        </option>
                      ))}
                    </Select>

                    <Select
                      name={fields.kilde.name}
                      id={fields.kilde.id}
                      label="Kilde"
                      error={fields.kilde.errors?.[0]}
                      className="w-52"
                      defaultValue={fields.kilde.initialValue ?? ""}
                    >
                      <option value="">Velg kilde</option>
                      {kilder.map((k) => (
                        <option key={k} value={k}>
                          {kildeEtiketter[k] ?? k}
                        </option>
                      ))}
                    </Select>

                    <TextField
                      id={fields.organisasjonsnummer.id}
                      key={fields.organisasjonsnummer.key}
                      name={fields.organisasjonsnummer.name}
                      defaultValue={fields.organisasjonsnummer.initialValue}
                      label="Organisasjonsnummer (valgfritt)"
                      inputMode="numeric"
                      htmlSize={14}
                      error={fields.organisasjonsnummer.errors?.[0]}
                      autoComplete="off"
                    />
                  </HStack>

                  {/* Rad 2: Misbruktype, Merking, Enhet */}
                  <HStack gap="space-24" align="start" wrap>
                    {tilgjengeligeMisbruktyper.length > 0 && (
                      <div id={fields.misbruktype.id} className="w-72">
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
                          error={fields.misbruktype.errors?.[0]}
                        />
                        {valgteMisbruktyper.map((m) => (
                          <input key={m} type="hidden" name="misbruktype" value={m} />
                        ))}
                      </div>
                    )}

                    <div id={fields.merking.id} className="w-72">
                      <UNSAFE_Combobox
                        label="Merking (valgfritt)"
                        options={alleMerkinger.map((verdi) => ({
                          value: verdi,
                          label: merkingEtiketter[verdi] ?? verdi,
                        }))}
                        isMultiSelect
                        allowNewValues
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
                        error={fields.merking.errors?.[0]}
                      />
                      {valgteMerkinger.map((m) => (
                        <input key={m} type="hidden" name="merking" value={m} />
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
                          feil={form.allErrors}
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
