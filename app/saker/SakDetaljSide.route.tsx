import { ArrowLeftIcon } from "@navikt/aksel-icons";
import {
  BodyShort,
  Box,
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
import { formaterKilde, hentStatusVariant } from "./utils";

const alleSaker = [...mockSaker, ...mockMineSaker];

export function loader({ params }: Route.LoaderArgs) {
  const sak = alleSaker.find((s) => s.id === params.sakId);
  if (!sak) {
    throw data("Sak ikke funnet", { status: 404 });
  }
  const historikk = hentHistorikk(sak.id);
  const filer = hentFilerForSak(sak.id);
  return { sak, historikk, filer, saksbehandlere: mockSaksbehandlere, seksjoner: mockSeksjoner };
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
    <div>
      <Detail className="text-ax-text-neutral-subtle" uppercase>
        {label}
      </Detail>
      <BodyShort className="mt-05">{children}</BodyShort>
    </div>
  );
}

export default function SakDetaljSide() {
  const { sak, historikk, filer, saksbehandlere, seksjoner } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <Page>
      <title>{`Sak ${sak.id} – Watson Sak`}</title>
      <PageBlock width="lg" gutters>
        <VStack gap="space-6" className="mt-4 mb-8">
          <div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="navds-link cursor-pointer bg-transparent border-none p-0"
            >
              <HStack gap="space-1" align="center">
                <ArrowLeftIcon aria-hidden />
                Tilbake
              </HStack>
            </button>
          </div>

          <HStack justify="space-between" align="center">
            <HStack gap="space-4" align="center">
              <Heading level="1" size="large">
                Sak {sak.id}
              </Heading>
              <Tag variant={hentStatusVariant(sak.status)}>{sak.status}</Tag>
            </HStack>
          </HStack>

          <HGrid columns={{ xs: 1, md: "1fr auto" }} gap="space-6">
            <VStack gap="space-6">
              <HGrid columns={{ xs: 1, md: 2 }} gap="space-6">
                <Box padding="space-6" borderRadius="8" background="raised">
                  <Heading level="2" size="small" spacing>
                    Saksinformasjon
                  </Heading>
                  <HGrid columns={2} gap="space-4">
                    <Felt label="Dato innmeldt">{formaterDato(sak.datoInnmeldt)}</Felt>
                    <Felt label="Kilde">{formaterKilde(sak.kilde)}</Felt>
                    <Felt label="Fødselsnummer">{sak.fødselsnummer}</Felt>
                    <Felt label="Seksjon">{sak.seksjon}</Felt>
                    {sak.avdeling && <Felt label="Avdeling">{sak.avdeling}</Felt>}
                    {sak.kategori && <Felt label="Kategori">{sak.kategori}</Felt>}
                  </HGrid>
                  {sak.ytelser.length > 0 && (
                    <div className="mt-4">
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
                    <div className="mt-4">
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
                </Box>

                <VStack gap="space-6">
                  {(sak.fraDato || sak.tilDato) && (
                    <Box padding="space-6" borderRadius="8" background="raised">
                      <Heading level="2" size="small" spacing>
                        Periode
                      </Heading>
                      <HGrid columns={2} gap="space-4">
                        {sak.fraDato && <Felt label="Fra dato">{formaterDato(sak.fraDato)}</Felt>}
                        {sak.tilDato && <Felt label="Til dato">{formaterDato(sak.tilDato)}</Felt>}
                      </HGrid>
                    </Box>
                  )}

                  {sak.kontaktinformasjon && !sak.kontaktinformasjon.anonymt && (
                    <Box padding="space-6" borderRadius="8" background="raised">
                      <Heading level="2" size="small" spacing>
                        Kontaktinformasjon
                      </Heading>
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
                    </Box>
                  )}

                  {sak.kontaktinformasjon?.anonymt && (
                    <Box padding="space-6" borderRadius="8" background="raised">
                      <Heading level="2" size="small" spacing>
                        Kontaktinformasjon
                      </Heading>
                      <Tag variant="neutral" size="small">
                        Anonymt tips
                      </Tag>
                    </Box>
                  )}
                </VStack>
              </HGrid>

              {(sak.notat || sak.beskrivelse) && (
                <Box padding="space-6" borderRadius="8" background="raised">
                  <Heading level="2" size="small" spacing>
                    {sak.beskrivelse ? "Beskrivelse" : "Notat"}
                  </Heading>
                  <BodyShort>{sak.beskrivelse ?? sak.notat}</BodyShort>
                </Box>
              )}

              <SakFilområde filer={filer} />

              <SakHistorikk hendelser={historikk} />
            </VStack>

            <SakHandlingerKnapper sak={sak} saksbehandlere={saksbehandlere} seksjoner={seksjoner} />
          </HGrid>
        </VStack>
      </PageBlock>
    </Page>
  );
}
