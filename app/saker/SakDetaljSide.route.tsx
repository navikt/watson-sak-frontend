import { ArrowLeftIcon, PencilIcon } from "@navikt/aksel-icons";
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
import { SakerPåSammePerson } from "./komponenter/SakerPåSammePerson";
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
  const andreSaker = hentDetaljSaker().filter(
    (annenSak) =>
      annenSak.personIdent === sak.personIdent && annenSak.id !== sak.id,
  );
  return {
    sak,
    historikk,
    filer,
    journalposter,
    andreSaker,
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
    case "koble_sak": {
      break;
    }
  }

  return { ok: true };
}

function Felt({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <VStack gap="space-1">
      <Detail className="text-ax-text-neutral-subtle" uppercase>
        {label}
      </Detail>
      <BodyShort>{children}</BodyShort>
    </VStack>
  );
}

export default function SakDetaljSide() {
  const {
    sak,
    historikk,
    filer,
    journalposter,
    andreSaker,
    saksbehandlere,
    seksjoner,
  } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const personIdent = getPersonIdent(sak);
  const statusTekst = getStatus(sak);
  const kildeTekst = getKildeText(sak);
  const ytelseTyper = getYtelseTyper(sak);
  const beskrivelse = getBeskrivelse(sak);
  const kontaktinformasjon = getKontaktinformasjon(sak);
  const erAktiv = erAktivSakKontrollsak(sak.status);
  const saksreferanse = getSaksreferanse(sak.id);
  const navn = getNavn(sak);
  const alder = getAlder(sak);
  const kategoriText = getKategoriText(sak);
  const misbrukstyper = getMisbrukstyper(sak);
  const belop = getBelop(sak);
  const periodeText = getPeriodeText(sak);
  const tags = getTags(sak);

  const tittel = navn
    ? `Sak ${saksreferanse} – ${navn}${alder !== null ? ` (${alder})` : ""}`
    : `Sak ${saksreferanse}`;

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
                    <Tag variant={getStatusVariantForSak(sak)}>
                      {statusTekst}
                    </Tag>
                  </HStack>

                  <hr className="border-ax-border-neutral-subtle" />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <VStack gap="space-4">
                      <VStack gap="space-1">
                        <Detail
                          className="text-ax-text-neutral-subtle"
                          uppercase
                        >
                          Personnummer
                        </Detail>
                        <HStack gap="space-1" align="center">
                          <BodyShort>{personIdent}</BodyShort>
                          <CopyButton size="xsmall" copyText={personIdent} />
                        </HStack>
                      </VStack>

                      {kategoriText && (
                        <VStack gap="space-1">
                          <Detail
                            className="text-ax-text-neutral-subtle"
                            uppercase
                          >
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
                          <Detail
                            className="text-ax-text-neutral-subtle"
                            uppercase
                          >
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
                          <Detail
                            className="text-ax-text-neutral-subtle"
                            uppercase
                          >
                            Merking
                          </Detail>
                          <HStack gap="space-2" wrap>
                            {tags.map((tag) => (
                              <Tag key={tag} variant="neutral" size="small">
                                {tag}
                              </Tag>
                            ))}
                          </HStack>
                        </VStack>
                      )}

                      <Felt label="Kilde">{kildeTekst}</Felt>
                    </VStack>

                    <VStack gap="space-4">
                      {periodeText && (
                        <Felt label="Periode">{periodeText}</Felt>
                      )}

                      {belop !== null && (
                        <Felt label="Ca beløp">{formaterBelop(belop)}</Felt>
                      )}

                      {ytelseTyper.length > 0 && (
                        <VStack gap="space-1">
                          <Detail
                            className="text-ax-text-neutral-subtle"
                            uppercase
                          >
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
                    <HStack justify="end">
                      <Button
                        variant="tertiary"
                        size="xsmall"
                        icon={<PencilIcon aria-hidden />}
                        aria-label="Rediger saksinformasjon"
                      >
                        Rediger
                      </Button>
                    </HStack>
                  )}
                </VStack>
              </Kort>

              <SakFilområde filer={filer} redigerbar={erAktiv} />

              <SakerPåSammePerson saker={andreSaker} gjeldendeSakId={sak.id} />
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
                          <Felt label="Telefon">
                            {kontaktinformasjon.telefon}
                          </Felt>
                        )}
                        {kontaktinformasjon.epost && (
                          <Felt label="E-post">{kontaktinformasjon.epost}</Felt>
                        )}
                      </VStack>
                    )}
                  </VStack>
                </Kort>
              )}

              <SakHistorikk hendelser={historikk} />
            </VStack>
          </HGrid>
        </VStack>
      </PageBlock>
    </Page>
  );
}
