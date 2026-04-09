import {
  LocalAlert,
  BodyShort,
  Button,
  DatePicker,
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
import { PersonIcon } from "@navikt/aksel-icons";
import { PageBlock } from "@navikt/ds-react/Page";
import { useState } from "react";
import { Form, Link, useFetcher, useActionData, useLoaderData } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { kontrollsakKategoriEtiketter } from "~/saker/kategorier";
import type { PersonOppslagResultat } from "./person-oppslag.mock.server";
import { action, loader } from "./RegistrerSakSide.server";

export { action, loader };

const kildeEtiketter: Record<string, string> = {
  INTERN: "Intern",
  EKSTERN: "Ekstern",
  ANONYM_TIPS: "Anonymt tips",
  PUBLIKUM: "Publikum",
};

const enhetEtiketter: Record<string, string> = {
  ØST: "Øst",
  VEST: "Vest",
  NORD: "Nord",
  SØR: "Sør",
  OSLO: "Oslo",
};

const merkingEtiketter: Record<string, string> = {
  PRIORITERT: "Prioritert",
  SENSITIV: "Sensitiv",
  POLITIANMELDELSE: "Politianmeldelse",
  ANNET: "Annet",
};

export default function OpprettSakSide() {
  const { ytelser, kategorier, misbrukstypePerKategori, merkinger, enheter, kilder } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const feil =
    actionData && "feil" in actionData ? (actionData.feil as Record<string, string[]>) : undefined;

  const [valgteYtelser, setValgteYtelser] = useState<string[]>([]);
  const [valgtKategori, setValgtKategori] = useState<string>("");
  const [søkeFnr, setSøkeFnr] = useState("");

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

  const misbrukstyper = valgtKategori
    ? ((misbrukstypePerKategori as Record<string, string[]>)[valgtKategori] ?? [])
    : [];
  const visMisbruktype = misbrukstyper.length > 0;

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
            <VStack gap="space-40">
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

              {/* Eksisterende saker */}
              {eksisterendeSaker.length > 0 &&
                eksisterendeSaker.map((sak) => {
                  const dato = new Date(sak.opprettetDato).toLocaleDateString("nb-NO", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  });
                  return (
                    <LocalAlert key={sak.sakId} status="announcement" className="max-w-2xl">
                      <LocalAlert.Header>
                        <LocalAlert.Title as="h2">
                          Det er allerede registrert en sak på personen
                        </LocalAlert.Title>
                      </LocalAlert.Header>
                      <LocalAlert.Content>
                        <VStack gap="space-4">
                          <BodyShort>
                            {dato} ble det opprettet en sak på {sak.personNavn}. Kanskje gjelder
                            dette samme sak?
                          </BodyShort>
                          <HStack gap="space-4">
                            <Button
                              as={Link}
                              to={RouteConfig.SAKER_DETALJ.replace(":sakId", sak.sakId)}
                              variant="secondary"
                              size="small"
                            >
                              Se sak
                            </Button>
                          </HStack>
                        </VStack>
                      </LocalAlert.Content>
                    </LocalAlert>
                  );
                })}

              {/* Skjema */}
              <Form method="post" aria-label="Grunnleggende saksinformasjon">
                {/* Personident sendes som hidden felt */}
                <input
                  type="hidden"
                  name="personIdent"
                  value={person.personnummer.replace(/\s/g, "")}
                />

                <VStack gap="space-40">
                  <Heading level="2" size="medium">
                    Grunnleggende saksinformasjon
                  </Heading>

                  {/* Rad 1: Kategori, Misbruktype, Merking */}
                  <HStack gap="space-24" align="start" wrap>
                    <Select
                      name="kategori"
                      label="Kategori"
                      error={feil?.kategori?.join(", ")}
                      className="w-52"
                      value={valgtKategori}
                      onChange={(e) => setValgtKategori(e.target.value)}
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

                    {visMisbruktype && (
                      <Select
                        name="misbruktype"
                        label="Misbruktype"
                        error={feil?.misbruktype?.join(", ")}
                        className="w-52"
                      >
                        <option value="">Velg misbruktype</option>
                        {misbrukstyper.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </Select>
                    )}

                    <Select
                      name="merking"
                      label="Merking (valgfritt)"
                      error={feil?.merking?.join(", ")}
                      className="w-52"
                    >
                      <option value="">Velg merking</option>
                      {merkinger.map((m) => (
                        <option key={m} value={m}>
                          {merkingEtiketter[m] ?? m}
                        </option>
                      ))}
                    </Select>
                  </HStack>

                  {/* Rad 2: Fra dato, Til dato, Ytelse, Ca beløp */}
                  <HStack gap="space-24" align="start" wrap>
                    <DatePicker>
                      <DatePicker.Input
                        name="fraDato"
                        label="Fra dato"
                        error={feil?.fraDato?.join(", ")}
                      />
                    </DatePicker>

                    <DatePicker>
                      <DatePicker.Input
                        name="tilDato"
                        label="Til dato"
                        error={feil?.tilDato?.join(", ")}
                      />
                    </DatePicker>

                    <UNSAFE_Combobox
                      label="Ytelse"
                      options={ytelser}
                      isMultiSelect
                      selectedOptions={valgteYtelser}
                      onToggleSelected={(option, isSelected) => {
                        setValgteYtelser((prev) =>
                          isSelected ? [...prev, option] : prev.filter((y) => y !== option),
                        );
                      }}
                      error={feil?.ytelser?.join(", ")}
                      className="w-64"
                    />
                    {valgteYtelser.map((ytelse) => (
                      <input key={ytelse} type="hidden" name="ytelser" value={ytelse} />
                    ))}

                    <TextField
                      name="caBeløp"
                      label="Ca beløp (valgfritt)"
                      inputMode="numeric"
                      htmlSize={14}
                      error={feil?.caBeløp?.join(", ")}
                    />
                  </HStack>

                  {/* Rad 3: Enhet, Kilde, Organisasjonsnummer */}
                  <HStack gap="space-24" align="start" wrap>
                    <Select
                      name="enhet"
                      label="Enhet"
                      error={feil?.enhet?.join(", ")}
                      className="w-44"
                    >
                      <option value="">Velg enhet</option>
                      {enheter.map((e) => (
                        <option key={e} value={e}>
                          {enhetEtiketter[e] ?? e}
                        </option>
                      ))}
                    </Select>

                    <Select
                      name="kilde"
                      label="Kilde"
                      error={feil?.kilde?.join(", ")}
                      className="w-44"
                    >
                      <option value="">Velg kilde</option>
                      {kilder.map((k) => (
                        <option key={k} value={k}>
                          {kildeEtiketter[k] ?? k}
                        </option>
                      ))}
                    </Select>

                    <TextField
                      name="organisasjonsnummer"
                      label="Organisasjonsnummer (valgfritt)"
                      inputMode="numeric"
                      htmlSize={14}
                      error={feil?.organisasjonsnummer?.join(", ")}
                      autoComplete="off"
                    />
                  </HStack>

                  {/* Submit */}
                  <HStack justify="end">
                    <Button type="submit">Opprett sak</Button>
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
