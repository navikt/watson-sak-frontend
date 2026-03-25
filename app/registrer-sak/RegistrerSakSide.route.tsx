import {
  BodyShort,
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
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { mockYtelser } from "~/fordeling/mock-data.server";
import { Kort } from "~/komponenter/Kort";
import { RouteConfig } from "~/routeConfig";
import type { Route } from "./+types/RegistrerSakSide.route";
import { opprettKontrollsak } from "./api.server";
import {
  kategoriAlternativer,
  kildeAlternativer,
  prioritetAlternativer,
  registrerSakSchema,
  type RegistrerSakSkjema,
} from "./validering";

const kategoriTilEtikett = {
  UDEFINERT: "Udefinert",
  FEILUTBETALING: "Feilutbetaling",
  MISBRUK: "Misbruk",
  OPPFØLGING: "Oppfølging",
} as const;

const prioritetTilEtikett = {
  HØY: "Høy",
  NORMAL: "Normal",
  LAV: "Lav",
} as const;

const kildeTilEtikett = {
  INTERN: "Intern",
  EKSTERN: "Ekstern",
  ANONYM_TIPS: "Anonymt tips",
} as const;

function hentMottakEnhet(organisasjoner: string) {
  const førsteEnhet = organisasjoner.split(",")[0]?.trim();

  if (!førsteEnhet) {
    throw new Error("Fant ingen mottakende enhet i organisasjoner.");
  }

  if (!/^\d{4}$/.test(førsteEnhet)) {
    throw new Error(
      `Ugyldig mottakende enhet: '${førsteEnhet}'. Forventet enhetsnummer (4 sifre).`,
    );
  }

  return førsteEnhet;
}

function byggYtelser(ytelser: RegistrerSakSkjema["ytelser"], fraDato: string, tilDato: string) {
  return ytelser.map((ytelse) => ({
    type: ytelse,
    periodeFra: fraDato,
    periodeTil: tilDato,
  }));
}

function byggAvsender(data: RegistrerSakSkjema) {
  if (
    !data.avsenderNavn &&
    !data.avsenderTelefon &&
    !data.avsenderAdresse &&
    !data.avsenderAnonym
  ) {
    return null;
  }

  return {
    navn: data.avsenderNavn,
    telefon: data.avsenderTelefon,
    adresse: data.avsenderAdresse,
    anonym: data.avsenderAnonym,
  };
}

export function loader() {
  return {
    ytelser: mockYtelser,
    kategorier: kategoriAlternativer,
    prioriteringer: prioritetAlternativer,
    kilder: kildeAlternativer,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();

  const rådata = {
    personIdent: formData.get("personIdent"),
    ytelser: formData.getAll("ytelser"),
    fraDato: formData.get("fraDato") || undefined,
    tilDato: formData.get("tilDato") || undefined,
    kategori: formData.get("kategori"),
    prioritet: formData.get("prioritet"),
    kilde: formData.get("kilde"),
    bakgrunn: formData.get("bakgrunn"),
    avsenderNavn: formData.get("avsenderNavn") || undefined,
    avsenderTelefon: formData.get("avsenderTelefon") || undefined,
    avsenderAdresse: formData.get("avsenderAdresse") || undefined,
    avsenderAnonym: formData.get("avsenderAnonym") === "on",
  };

  const resultat = registrerSakSchema.safeParse(rådata);

  if (!resultat.success) {
    return { feil: resultat.error.flatten().fieldErrors };
  }

  const innloggetBruker = await hentInnloggetBruker({ request });
  const data = resultat.data;

  await opprettKontrollsak({
    token: innloggetBruker.token,
    payload: {
      personIdent: data.personIdent,
      saksbehandler: innloggetBruker.navIdent,
      mottakEnhet: hentMottakEnhet(innloggetBruker.organisasjoner),
      mottakSaksbehandler: innloggetBruker.navIdent,
      kategori: data.kategori,
      prioritet: data.prioritet,
      ytelser: byggYtelser(data.ytelser, data.fraDato, data.tilDato),
      bakgrunn: {
        kilde: data.kilde,
        innhold: data.bakgrunn,
        avsender: byggAvsender(data),
        vedlegg: [],
        tilleggsopplysninger: null,
      },
    },
  });

  return redirect(RouteConfig.INDEX);
}

export default function RegistrerSakSide() {
  const { ytelser, kategorier, prioriteringer, kilder } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const feil =
    actionData && "feil" in actionData ? (actionData.feil as Record<string, string[]>) : undefined;

  const [valgteYtelser, setValgteYtelser] = useState<string[]>([]);

  return (
    <Page>
      <title>Registrer sak – Watson Sak</title>
      <PageBlock width="lg" gutters>
        <Heading level="1" size="large" spacing className="mt-4">
          Registrer sak
        </Heading>

        <Form method="post" className="max-w-3xl">
          <VStack gap="space-16">
            <Kort as="section" padding="space-12">
              <Heading level="2" size="small" spacing>
                Saksinformasjon
              </Heading>
              <VStack gap="space-8">
                <TextField
                  name="personIdent"
                  label="Fødselsnummer"
                  description="11 siffer"
                  inputMode="numeric"
                  maxLength={11}
                  htmlSize={20}
                  error={feil?.personIdent?.join(", ")}
                  autoComplete="off"
                />

                <HStack gap="space-8">
                  <Select name="kategori" label="Kategori" error={feil?.kategori?.join(", ")}>
                    <option value="">Velg kategori</option>
                    {kategorier.map((kategori) => (
                      <option key={kategori} value={kategori}>
                        {kategoriTilEtikett[kategori]}
                      </option>
                    ))}
                  </Select>

                  <Select name="prioritet" label="Prioritet" error={feil?.prioritet?.join(", ")}>
                    <option value="">Velg prioritet</option>
                    {prioriteringer.map((prioritet) => (
                      <option key={prioritet} value={prioritet}>
                        {prioritetTilEtikett[prioritet]}
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
            </Kort>

            <Kort as="section" padding="space-12">
              <Heading level="2" size="small" spacing>
                Ytelser
              </Heading>
              <VStack gap="space-8">
                <UNSAFE_Combobox
                  label="Ytelser"
                  options={ytelser}
                  isMultiSelect
                  selectedOptions={valgteYtelser}
                  onToggleSelected={(option, isSelected) => {
                    setValgteYtelser((prev) =>
                      isSelected ? [...prev, option] : prev.filter((ytelse) => ytelse !== option),
                    );
                  }}
                />
                {valgteYtelser.map((ytelse) => (
                  <input key={ytelse} type="hidden" name="ytelser" value={ytelse} />
                ))}
                {feil?.ytelser && (
                  <BodyShort className="text-ax-text-danger" size="small">
                    {feil.ytelser.join(", ")}
                  </BodyShort>
                )}
              </VStack>
            </Kort>

            <Kort as="section" padding="space-12">
              <Heading level="2" size="small" spacing>
                Bakgrunn
              </Heading>
              <VStack gap="space-8">
                <Select
                  name="kilde"
                  label="Kilde"
                  error={feil?.kilde?.join(", ")}
                  className="w-fit"
                >
                  <option value="">Velg kilde</option>
                  {kilder.map((kilde) => (
                    <option key={kilde} value={kilde}>
                      {kildeTilEtikett[kilde]}
                    </option>
                  ))}
                </Select>

                <Textarea
                  name="bakgrunn"
                  label="Bakgrunn"
                  description="Beskriv saken så detaljert som mulig"
                  minRows={4}
                  error={feil?.bakgrunn?.join(", ")}
                />

                <Heading level="3" size="xsmall" spacing={false}>
                  Avsender
                </Heading>
                <HStack gap="space-8" align="end">
                  <TextField name="avsenderNavn" label="Navn" autoComplete="off" />
                  <TextField
                    name="avsenderTelefon"
                    label="Telefon"
                    inputMode="tel"
                    autoComplete="off"
                  />
                  <TextField name="avsenderAdresse" label="Adresse" autoComplete="off" />
                  <Checkbox name="avsenderAnonym" value="on">
                    Anonym avsender
                  </Checkbox>
                </HStack>
              </VStack>
            </Kort>

            <HStack gap="space-4">
              <Button type="submit">Registrer sak</Button>
              <Button type="button" variant="secondary" as="a" href={RouteConfig.INDEX}>
                Avbryt
              </Button>
            </HStack>
          </VStack>
        </Form>
      </PageBlock>
    </Page>
  );
}
