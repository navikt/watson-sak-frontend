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
import { mockSaksbehandlere } from "~/saker/mock-saksbehandlere.server";
import { mockSeksjoner } from "~/saker/mock-seksjoner.server";
import type { Route } from "./+types/SakDetaljSide.route";
import { hentFilerForSak } from "./filer/mock-data.server";
import { SakFilområde } from "./filer/SakFilområde";
import { SakHandlingerKnapper } from "./handlinger/SakHandlingerKnapper";
import { erAktivSakKontrollsak } from "./handlinger/tilgjengeligeHandlinger";
import { SakHistorikk } from "./historikk/SakHistorikk";
import { hentHistorikk, leggTilHendelse } from "./historikk/mock-data.server";
import { hentJournalposter } from "./joark/mock-data.server";
import { finnSakMedReferanse, getSaksreferanse } from "./id";
import { JoarkOversikt } from "./joark/JoarkOversikt";
import { hentAlleSaker } from "./mock-alle-saker.server";
import {
  getAvdeling,
  getKategoriText,
  getOpprettetDato,
  getPeriodeText,
  getSaksenhet,
  getStatusVariantForSak,
  getTags,
} from "./selectors";
import {
  getBeskrivelse,
  getKildeText,
  getKontaktinformasjon,
  getPersonIdent,
  getStatus,
  getYtelseTyper,
  type KontrollsakStatus,
} from "./visning";

const gyldigeStatuser = new Set<KontrollsakStatus>([
  "OPPRETTET",
  "AVKLART",
  "UTREDES",
  "TIL_FORVALTNING",
  "HENLAGT",
  "AVSLUTTET",
]);

function erGyldigStatus(verdi: string): verdi is KontrollsakStatus {
  return gyldigeStatuser.has(verdi as KontrollsakStatus);
}

function hentDetaljSaker() {
  return hentAlleSaker();
}

export function loader({ params }: Route.LoaderArgs) {
  const sak = finnSakMedReferanse(hentDetaljSaker(), params.sakId);
  if (!sak) {
    throw data("Sak ikke funnet", { status: 404 });
  }
  const historikk = hentHistorikk(sak.id);
  const filer = hentFilerForSak(sak.id);
  const journalposter = hentJournalposter(getPersonIdent(sak));
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

  const sak = finnSakMedReferanse(hentDetaljSaker(), sakId);
  if (!sak) {
    throw data("Sak ikke funnet", { status: 404 });
  }

  switch (handling) {
    case "endre_status": {
      const nyStatus = formData.get("status") as string;

      if (!erGyldigStatus(nyStatus)) {
        throw data("Ugyldig status", { status: 400 });
      }

      sak.status = nyStatus;
      leggTilHendelse(sak, "STATUS_ENDRET");
      break;
    }
    case "tildel": {
      const saksbehandler = formData.get("saksbehandler") as string;
      const gammelStatus = sak.status;

      sak.status = "UTREDES";
      sak.saksbehandler = saksbehandler;

      leggTilHendelse(sak, "SAK_TILDELT");

      const nyStatus = "UTREDES";

      if (gammelStatus !== nyStatus) {
        leggTilHendelse(sak, "STATUS_ENDRET");
      }
      break;
    }
    case "videresend_seksjon": {
      const nySeksjon = formData.get("seksjon") as string;

      sak.mottakEnhet = nySeksjon;
      leggTilHendelse(sak, "MOTTAKSENHET_ENDRET");
      break;
    }
    case "henlegg": {
      sak.status = "HENLAGT";
      leggTilHendelse(sak, "SAK_HENLAGT");
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
  const personIdent = getPersonIdent(sak);
  const statusTekst = getStatus(sak);
  const kildeTekst = getKildeText(sak);
  const ytelseTyper = getYtelseTyper(sak);
  const beskrivelse = getBeskrivelse(sak);
  const kontaktinformasjon = getKontaktinformasjon(sak);
  const opprettetDato = getOpprettetDato(sak);
  const saksenhet = getSaksenhet(sak);
  const avdeling = getAvdeling(sak);
  const kategoriText = getKategoriText(sak);
  const periodeText = getPeriodeText(sak);
  const tags = getTags(sak);
  const erAktiv = erAktivSakKontrollsak(sak.status);
  const saksreferanse = getSaksreferanse(sak.id);

  const iconProps = { "aria-hidden": true as const, fontSize: "1.25rem" };

  return (
    <Page>
      <title>{`Sak ${saksreferanse} – Watson Sak`}</title>
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
                  Sak {saksreferanse}
                </Heading>
                <Tag variant={getStatusVariantForSak(sak)}>{statusTekst}</Tag>
              </HStack>
              <HStack gap="space-6" align="center" wrap>
                <MetadataPunkt icon={<CalendarIcon {...iconProps} />}>
                  {formaterDato(opprettetDato)}
                </MetadataPunkt>
                <MetadataPunkt icon={<InboxDownIcon {...iconProps} />}>{kildeTekst}</MetadataPunkt>
                <MetadataPunkt icon={<Buildings2Icon {...iconProps} />}>{saksenhet}</MetadataPunkt>
                {avdeling && (
                  <MetadataPunkt icon={<Buildings2Icon {...iconProps} />}>{avdeling}</MetadataPunkt>
                )}
                {kategoriText && (
                  <MetadataPunkt icon={<TagIcon {...iconProps} />}>{kategoriText}</MetadataPunkt>
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
                        <BodyShort>{personIdent}</BodyShort>
                        <CopyButton size="xsmall" copyText={personIdent} />
                      </HStack>
                    </VStack>

                    {periodeText && <Felt label="Periode">{periodeText}</Felt>}
                  </HGrid>

                  {(ytelseTyper.length > 0 || tags.length > 0) && (
                    <>
                      <hr className="border-ax-border-neutral-subtle" />
                      <VStack gap="space-4">
                        {ytelseTyper.length > 0 && (
                          <div>
                            <Detail className="text-ax-text-neutral-subtle mb-1" uppercase>
                              Ytelser
                            </Detail>
                            <HStack gap="space-2" wrap>
                              {ytelseTyper.map((ytelse) => (
                                <Tag key={ytelse} variant="info" size="small">
                                  {ytelse}
                                </Tag>
                              ))}
                            </HStack>
                          </div>
                        )}
                        {tags.length > 0 && (
                          <div>
                            <Detail className="text-ax-text-neutral-subtle mb-1" uppercase>
                              Tags
                            </Detail>
                            <HStack gap="space-2" wrap>
                              {tags.map((tag) => (
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

              {beskrivelse && (
                <Kort>
                  <Heading level="2" size="small" spacing>
                    Beskrivelse
                  </Heading>
                  <BodyLong>{beskrivelse}</BodyLong>
                </Kort>
              )}

              <SakFilområde filer={filer} redigerbar={erAktiv} />

              <JoarkOversikt journalposter={journalposter} />

              <SakHistorikk hendelser={historikk} />
            </VStack>

            <VStack gap="space-6" className="md:sticky md:top-4 md:self-start">
              <SakHandlingerKnapper
                sak={sak}
                saksbehandlere={saksbehandlere}
                seksjoner={seksjoner}
              />

              {kontaktinformasjon && (
                <Kort padding="space-6">
                  <VStack gap="space-4">
                    <Heading level="2" size="small">
                      Kontaktinformasjon
                    </Heading>
                    {kontaktinformasjon.anonymt ? (
                      <Tag variant="neutral" size="small">
                        Anonymt tips
                      </Tag>
                    ) : (
                      <VStack gap="space-2">
                        {kontaktinformasjon.navn && (
                          <Felt label="Navn">{kontaktinformasjon.navn}</Felt>
                        )}
                        {kontaktinformasjon.telefon && (
                          <Felt label="Telefon">{kontaktinformasjon.telefon}</Felt>
                        )}
                        {kontaktinformasjon.epost && (
                          <Felt label="E-post">{kontaktinformasjon.epost}</Felt>
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
