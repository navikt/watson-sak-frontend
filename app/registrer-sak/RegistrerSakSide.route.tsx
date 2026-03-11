import {
  BodyShort,
  Box,
  Button,
  Checkbox,
  DatePicker,
  Heading,
  HStack,
  Page,
  Select,
  Textarea,
  TextField,
  UNSAFE_Combobox,
  VStack,
} from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { useState } from "react";
import { Form, redirect, useActionData, useLoaderData } from "react-router";
import {
  mockAvdelinger,
  mockKategorier,
  mockSaker,
  mockTags,
  mockYtelser,
} from "~/fordeling/mock-data.server";
import { leggTilHendelse } from "~/saker/historikk/mock-data.server";
import { sakKildeSchema } from "~/saker/typer";
import { formaterKilde } from "~/saker/utils";
import { RouteConfig } from "~/routeConfig";
import type { Route } from "./+types/RegistrerSakSide.route";
import { registrerSakSchema } from "./validering";

export function loader() {
  return {
    avdelinger: mockAvdelinger,
    kategorier: mockKategorier,
    tags: mockTags,
    ytelser: mockYtelser,
    kilder: sakKildeSchema.options,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();

  const rådata = {
    fødselsnummer: formData.get("fødselsnummer"),
    ytelser: formData.getAll("ytelser"),
    fraDato: formData.get("fraDato") || undefined,
    tilDato: formData.get("tilDato") || undefined,
    avdeling: formData.get("avdeling"),
    kategori: formData.get("kategori"),
    tags: formData.getAll("tags"),
    kilde: formData.get("kilde"),
    kontaktNavn: formData.get("kontaktNavn") || undefined,
    kontaktTelefon: formData.get("kontaktTelefon") || undefined,
    kontaktEpost: formData.get("kontaktEpost") || undefined,
    anonymt: formData.get("anonymt") === "on",
    beskrivelse: formData.get("beskrivelse"),
  };

  const resultat = registrerSakSchema.safeParse(rådata);

  if (!resultat.success) {
    return { feil: resultat.error.flatten().fieldErrors };
  }

  const data = resultat.data;
  const nesteId = String(
    Math.max(0, ...mockSaker.map((s) => Number(s.id))) + 1,
  );

  mockSaker.push({
    id: nesteId,
    datoInnmeldt: new Date().toISOString().split("T")[0],
    kilde: data.kilde,
    notat: data.beskrivelse,
    fødselsnummer: data.fødselsnummer,
    ytelser: data.ytelser as string[],
    status: "tips mottatt",
    seksjon: data.avdeling,
    fraDato: data.fraDato,
    tilDato: data.tilDato,
    avdeling: data.avdeling,
    kategori: data.kategori,
    tags: data.tags as string[],
    kontaktinformasjon: {
      navn: data.kontaktNavn,
      telefon: data.kontaktTelefon,
      epost: data.kontaktEpost,
      anonymt: data.anonymt,
    },
    beskrivelse: data.beskrivelse,
  });

  leggTilHendelse(nesteId, "opprettet", "System");

  return redirect(RouteConfig.FORDELING);
}

export default function RegistrerSakSide() {
  const { avdelinger, kategorier, tags, ytelser, kilder } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const feil =
    actionData && "feil" in actionData
      ? (actionData.feil as Record<string, string[]>)
      : undefined;

  const [valgteYtelser, setValgteYtelser] = useState<string[]>([]);
  const [valgteTags, setValgteTags] = useState<string[]>([]);

  return (
    <Page>
      <title>Registrer sak – Watson Sak</title>
      <PageBlock width="lg" gutters>
        <Heading level="1" size="large" spacing className="mt-4">
          Registrer sak
        </Heading>

        <Form method="post" className="max-w-3xl">
          <VStack gap="space-8">
            <Box padding="space-6" borderRadius="8" background="raised">
              <Heading level="2" size="small" spacing>
                Saksinformasjon
              </Heading>
              <VStack gap="space-4">
                <div>
                  <TextField
                    name="fødselsnummer"
                    label="Fødselsnummer"
                    description="11 siffer"
                    inputMode="numeric"
                    maxLength={11}
                    htmlSize={20}
                    error={feil?.fødselsnummer?.join(", ")}
                    autoComplete="off"
                  />
                </div>

                <HStack gap="space-8">
                  <Select
                    name="avdeling"
                    label="Avdeling"
                    error={feil?.avdeling?.join(", ")}
                  >
                    <option value="">Velg avdeling</option>
                    {avdelinger.map((avd) => (
                      <option key={avd} value={avd}>
                        {avd}
                      </option>
                    ))}
                  </Select>

                  <Select
                    name="kategori"
                    label="Kategori"
                    error={feil?.kategori?.join(", ")}
                  >
                    <option value="">Velg kategori</option>
                    {kategorier.map((kat) => (
                      <option key={kat} value={kat}>
                        {kat}
                      </option>
                    ))}
                  </Select>
                </HStack>

                <HStack gap="space-8">
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
                </HStack>
              </VStack>
            </Box>

            <Box padding="space-6" borderRadius="8" background="raised">
              <Heading level="2" size="small" spacing>
                Ytelser og klassifisering
              </Heading>
              <HStack gap="space-8">
                <UNSAFE_Combobox
                  label="Ytelser"
                  options={ytelser}
                  isMultiSelect
                  selectedOptions={valgteYtelser}
                  onToggleSelected={(option, isSelected) => {
                    setValgteYtelser((prev) =>
                      isSelected
                        ? [...prev, option]
                        : prev.filter((y) => y !== option),
                    );
                  }}
                />
                {valgteYtelser.map((ytelse) => (
                  <input
                    key={ytelse}
                    type="hidden"
                    name="ytelser"
                    value={ytelse}
                  />
                ))}
                {feil?.ytelser && (
                  <BodyShort className="text-ax-text-danger" size="small">
                    {feil.ytelser.join(", ")}
                  </BodyShort>
                )}

                <UNSAFE_Combobox
                  label="Tags"
                  options={tags}
                  isMultiSelect
                  selectedOptions={valgteTags}
                  onToggleSelected={(option, isSelected) => {
                    setValgteTags((prev) =>
                      isSelected
                        ? [...prev, option]
                        : prev.filter((t) => t !== option),
                    );
                  }}
                />
                {valgteTags.map((tag) => (
                  <input key={tag} type="hidden" name="tags" value={tag} />
                ))}
              </HStack>
            </Box>

            <Box padding="space-6" borderRadius="8" background="raised">
              <Heading level="2" size="small" spacing>
                Kilde og kontaktinformasjon
              </Heading>
              <HStack gap="space-8">
                <Select
                  name="kilde"
                  label="Kilde"
                  error={feil?.kilde?.join(", ")}
                >
                  <option value="">Velg kilde</option>
                  {kilder.map((kilde) => (
                    <option key={kilde} value={kilde}>
                      {formaterKilde(kilde)}
                    </option>
                  ))}
                </Select>

                <TextField
                  name="kontaktNavn"
                  label="Kontaktperson – navn"
                  autoComplete="off"
                />

                <HStack gap="space-8">
                  <TextField
                    name="kontaktTelefon"
                    label="Telefon"
                    inputMode="tel"
                    autoComplete="off"
                  />
                  <TextField
                    name="kontaktEpost"
                    label="E-post"
                    type="email"
                    autoComplete="off"
                  />
                </HStack>

                <Checkbox name="anonymt" value="on">
                  Anonymt tips
                </Checkbox>
              </HStack>
            </Box>

            <Box padding="space-6" borderRadius="8" background="raised">
              <Heading level="2" size="small" spacing>
                Beskrivelse
              </Heading>
              <Textarea
                name="beskrivelse"
                label="Beskrivelse"
                description="Beskriv saken så detaljert som mulig"
                minRows={4}
                error={feil?.beskrivelse?.join(", ")}
              />
            </Box>

            <HStack gap="space-4">
              <Button type="submit">Registrer sak</Button>
              <Button
                type="button"
                variant="secondary"
                as="a"
                href={RouteConfig.FORDELING}
              >
                Avbryt
              </Button>
            </HStack>
          </VStack>
        </Form>
      </PageBlock>
    </Page>
  );
}
