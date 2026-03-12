import {
  ArrowLeftIcon,
  Buildings2Icon,
  CalendarIcon,
  InboxDownIcon,
  TagIcon,
} from "@navikt/aksel-icons";
import {
  BodyLong,
  BodyShort,
  Button,
  CopyButton,
  Detail,
  Heading,
  HGrid,
  HStack,
  Page,
  Tag,
  VStack,
} from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { data, useLoaderData, useNavigate } from "react-router";
import { Kort } from "~/komponenter/Kort";
import { formaterDato } from "~/utils/date-utils";
import { mockSaker } from "~/fordeling/mock-data.server";
import { mockMineSaker } from "~/mine-saker/mock-data.server";
import { mockSaksbehandlere } from "~/saker/mock-saksbehandlere.server";
import { mockSeksjoner } from "~/saker/mock-seksjoner.server";
import type { Route } from "./+types/SakDetaljSide.route";
import { hentFilerForSak } from "./filer/mock-data.server";
import { SakFilområde } from "./filer/SakFilområde";
import { SakHandlingerKnapper } from "./handlinger/SakHandlingerKnapper";
import { SakHistorikk } from "./historikk/SakHistorikk";
import { hentHistorikk, leggTilHendelse } from "./historikk/mock-data.server";
import { hentJournalposter } from "./joark/mock-data.server";
import { JoarkOversikt } from "./joark/JoarkOversikt";
import { formaterKilde, hentStatusVariant } from "./utils";

const alleSaker = [...mockSaker, ...mockMineSaker];

export function loader({ params }: Route.LoaderArgs) {
  const sak = alleSaker.find((s) => s.id === params.sakId);
  if (!sak) {
    throw data("Sak ikke funnet", { status: 404 });
  }
  const historikk = hentHistorikk(sak.id);
  const filer = hentFilerForSak(sak.id);
  const journalposter = hentJournalposter(sak.fødselsnummer);
  return {
    sak,
    historikk,
    filer,
    journalposter,
    saksbehandlere: mockSaksbehandlere,
    seksjoner: mockSeksjoner,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const handling = formData.get("handling") as string;
  const sakId = params.sakId;

  const sak = alleSaker.find((s) => s.id === sakId);
  if (!sak) {
    throw data("Sak ikke funnet", { status: 404 });
  }

  switch (handling) {
    case "endre_status": {
      const nyStatus = formData.get("status") as string;
      const notat = (formData.get("notat") as string) ?? undefined;
      const gammelStatus = sak.status;
      sak.status = nyStatus as typeof sak.status;
      leggTilHendelse(sakId, "status_endret", "Ola Nordmann", {
        fra: gammelStatus,
        til: nyStatus,
        notat,
      });
      break;
    }
    case "tildel": {
      const saksbehandler = formData.get("saksbehandler") as string;
      leggTilHendelse(sakId, "tildelt", "Ola Nordmann", { til: saksbehandler });
      break;
    }
    case "videresend_seksjon": {
      const nySeksjon = formData.get("seksjon") as string;
      const gammelSeksjon = sak.seksjon;
      sak.seksjon = nySeksjon;
      leggTilHendelse(sakId, "seksjon_endret", "Ola Nordmann", {
        fra: gammelSeksjon,
        til: nySeksjon,
      });
      break;
    }
    case "henlegg": {
      const notat = (formData.get("notat") as string) ?? undefined;
      const gammelStatus = sak.status;
      sak.status = "henlagt";
      leggTilHendelse(sakId, "henlagt", "Ola Nordmann", {
        fra: gammelStatus,
        notat,
      });
      break;
    }
  }

  return { ok: true };
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

function MetadataPunkt({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <HStack gap="space-2" align="center">
      <span className="text-ax-icon-neutral-subtle">{icon}</span>
      <BodyShort size="small">{children}</BodyShort>
    </HStack>
  );
}

export default function SakDetaljSide() {
  const { sak, historikk, filer, journalposter, saksbehandlere, seksjoner } =
    useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const iconProps = { "aria-hidden": true as const, fontSize: "1.25rem" };

  return (
    <Page>
      <title>{`Sak ${sak.id} – Watson Sak`}</title>
      <PageBlock width="xl" gutters className="!mx-0">
        <VStack gap="space-12" className="py-6">
          <VStack gap="space-4">
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

            <VStack gap="space-4">
              <HStack gap="space-4" align="center">
                <Heading level="1" size="large">
                  Sak {sak.id}
                </Heading>
                <Tag variant={hentStatusVariant(sak.status)}>{sak.status}</Tag>
              </HStack>
              <HStack gap="space-6" align="center" wrap>
                <MetadataPunkt icon={<CalendarIcon {...iconProps} />}>
                  {formaterDato(sak.datoInnmeldt)}
                </MetadataPunkt>
                <MetadataPunkt icon={<InboxDownIcon {...iconProps} />}>
                  {formaterKilde(sak.kilde)}
                </MetadataPunkt>
                <MetadataPunkt icon={<Buildings2Icon {...iconProps} />}>
                  {sak.seksjon}
                </MetadataPunkt>
                {sak.avdeling && (
                  <MetadataPunkt icon={<Buildings2Icon {...iconProps} />}>
                    {sak.avdeling}
                  </MetadataPunkt>
                )}
                {sak.kategori && (
                  <MetadataPunkt icon={<TagIcon {...iconProps} />}>{sak.kategori}</MetadataPunkt>
                )}
              </HStack>
            </VStack>
          </VStack>

          <HGrid columns={{ xs: 1, md: "1fr 280px" }} gap="space-8">
            <VStack gap="space-8">
              <Kort>
                <VStack gap="space-6">
                  <Heading level="2" size="small">
                    Saksinformasjon
                  </Heading>

                  <HGrid columns={{ xs: 1, sm: 2 }} gap="space-4">
                    <VStack gap="space-1">
                      <Detail className="text-ax-text-neutral-subtle" uppercase>
                        Fødselsnummer
                      </Detail>
                      <HStack gap="space-1" align="center">
                        <BodyShort>{sak.fødselsnummer}</BodyShort>
                        <CopyButton size="xsmall" copyText={sak.fødselsnummer} />
                      </HStack>
                    </VStack>

                    {(sak.fraDato || sak.tilDato) && (
                      <Felt label="Periode">
                        {sak.fraDato ? formaterDato(sak.fraDato) : "—"}
                        {" – "}
                        {sak.tilDato ? formaterDato(sak.tilDato) : "pågående"}
                      </Felt>
                    )}
                  </HGrid>

                  {(sak.ytelser.length > 0 || sak.tags.length > 0) && (
                    <>
                      <hr className="border-ax-border-neutral-subtle" />
                      <VStack gap="space-4">
                        {sak.ytelser.length > 0 && (
                          <div>
                            <Detail className="text-ax-text-neutral-subtle mb-1" uppercase>
                              Ytelser
                            </Detail>
                            <HStack gap="space-2" wrap>
                              {sak.ytelser.map((ytelse) => (
                                <Tag key={ytelse} variant="info" size="small">
                                  {ytelse}
                                </Tag>
                              ))}
                            </HStack>
                          </div>
                        )}
                        {sak.tags.length > 0 && (
                          <div>
                            <Detail className="text-ax-text-neutral-subtle mb-1" uppercase>
                              Tags
                            </Detail>
                            <HStack gap="space-2" wrap>
                              {sak.tags.map((tag) => (
                                <Tag key={tag} variant="neutral" size="small">
                                  {tag}
                                </Tag>
                              ))}
                            </HStack>
                          </div>
                        )}
                      </VStack>
                    </>
                  )}
                </VStack>
              </Kort>

              {(sak.notat || sak.beskrivelse) && (
                <Kort>
                  <Heading level="2" size="small" spacing>
                    {sak.beskrivelse ? "Beskrivelse" : "Notat"}
                  </Heading>
                  <BodyLong>{sak.beskrivelse ?? sak.notat}</BodyLong>
                </Kort>
              )}

              <SakFilområde filer={filer} />

              <JoarkOversikt journalposter={journalposter} />

              <SakHistorikk hendelser={historikk} />
            </VStack>

            <VStack gap="space-6" className="md:sticky md:top-4 md:self-start">
              <SakHandlingerKnapper
                sak={sak}
                saksbehandlere={saksbehandlere}
                seksjoner={seksjoner}
              />

              {sak.kontaktinformasjon && (
                <Kort padding="space-6">
                  <VStack gap="space-4">
                    <Heading level="2" size="small">
                      Kontaktinformasjon
                    </Heading>
                    {sak.kontaktinformasjon.anonymt ? (
                      <Tag variant="neutral" size="small">
                        Anonymt tips
                      </Tag>
                    ) : (
                      <VStack gap="space-2">
                        {sak.kontaktinformasjon.navn && (
                          <Felt label="Navn">{sak.kontaktinformasjon.navn}</Felt>
                        )}
                        {sak.kontaktinformasjon.telefon && (
                          <Felt label="Telefon">{sak.kontaktinformasjon.telefon}</Felt>
                        )}
                        {sak.kontaktinformasjon.epost && (
                          <Felt label="E-post">{sak.kontaktinformasjon.epost}</Felt>
                        )}
                      </VStack>
                    )}
                  </VStack>
                </Kort>
              )}
            </VStack>
          </HGrid>
        </VStack>
      </PageBlock>
    </Page>
  );
}
