import { ArrowLeftIcon, MenuElipsisVerticalIcon } from "@navikt/aksel-icons";
import {
  ActionMenu,
  BodyShort,
  Box,
  Button,
  Heading,
  HStack,
  Label,
  Page,
  Tag,
  VStack,
} from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { data, Link, useLoaderData } from "react-router";
import { formaterDato } from "~/utils/date-utils";
import { mockSaker } from "~/fordeling/mock-data.server";
import { SakHandlinger } from "~/fordeling/SakHandlinger";
import { mockMineSaker } from "~/mine-saker/mock-data.server";
import type { Route } from "./+types/SakDetaljSide.route";
import { formaterKilde, hentStatusVariant } from "./utils";

const alleSaker = [...mockSaker, ...mockMineSaker];

export function loader({ params }: Route.LoaderArgs) {
  const sak = alleSaker.find((s) => s.id === params.sakId);
  if (!sak) {
    throw data("Sak ikke funnet", { status: 404 });
  }
  return { sak };
}

export default function SakDetaljSide() {
  const { sak } = useLoaderData<typeof loader>();

  return (
    <Page>
      <title>{`Sak ${sak.id} – Watson Sak`}</title>
      <PageBlock width="lg" gutters>
        <VStack gap="space-4" className="mt-4">
          <div>
            <Link to=".." relative="path" className="navds-link">
              <HStack gap="space-1" align="center">
                <ArrowLeftIcon aria-hidden />
                Tilbake
              </HStack>
            </Link>
          </div>

          <HStack justify="space-between" align="center">
            <HStack gap="space-4" align="center">
              <Heading level="1" size="large">
                Sak {sak.id}
              </Heading>
              <Tag variant={hentStatusVariant(sak.status)}>{sak.status}</Tag>
            </HStack>

            <ActionMenu>
              <ActionMenu.Trigger>
                <Button
                  variant="secondary-neutral"
                  icon={<MenuElipsisVerticalIcon title="Handlinger" />}
                  size="small"
                >
                  Handlinger
                </Button>
              </ActionMenu.Trigger>
              <ActionMenu.Content>
                <SakHandlinger sakId={sak.id} />
              </ActionMenu.Content>
            </ActionMenu>
          </HStack>

          <Box padding="space-6" borderRadius="8" background="raised">
            <VStack gap="space-4">
              <div>
                <Label size="small">Dato innmeldt</Label>
                <BodyShort>{formaterDato(sak.datoInnmeldt)}</BodyShort>
              </div>
              <div>
                <Label size="small">Fødselsnummer</Label>
                <BodyShort>{sak.fødselsnummer}</BodyShort>
              </div>
              <div>
                <Label size="small">Kilde</Label>
                <BodyShort>{formaterKilde(sak.kilde)}</BodyShort>
              </div>
              <div>
                <Label size="small">Ytelser</Label>
                <BodyShort>{sak.ytelser.join(", ")}</BodyShort>
              </div>
              <div>
                <Label size="small">Seksjon</Label>
                <BodyShort>{sak.seksjon}</BodyShort>
              </div>
              <div>
                <Label size="small">Status</Label>
                <BodyShort>{sak.status}</BodyShort>
              </div>
            </VStack>
          </Box>

          <Box padding="space-6" borderRadius="8" background="raised">
            <Heading level="2" size="small" spacing>
              Notat
            </Heading>
            <BodyShort>{sak.notat}</BodyShort>
          </Box>
        </VStack>
      </PageBlock>
    </Page>
  );
}
