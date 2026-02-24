import { MenuElipsisVerticalIcon } from "@navikt/aksel-icons";
import {
  ActionMenu,
  BodyShort,
  Box,
  Button,
  Heading,
  HStack,
  Page,
  Tag,
  VStack,
} from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { Link, useLoaderData } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { mockSaker } from "./mock-data";
import { SakHandlinger } from "./SakHandlinger";
import type { Sak } from "./typer";
import { formaterDato, formaterKilde, hentStatusVariant } from "./utils";

export function loader() {
  return { saker: mockSaker };
}

export default function FordelingSide() {
  const { saker } = useLoaderData<typeof loader>();

  return (
    <Page>
      <title>Saker til fordeling – Watson Sak Admin</title>
      <PageBlock width="lg" gutters>
        <Heading level="1" size="large" spacing className="mt-4">
          Saker til fordeling
        </Heading>

        <VStack gap="space-4">
          {saker.map((sak) => (
            <SakKort key={sak.id} sak={sak} />
          ))}
        </VStack>
      </PageBlock>
    </Page>
  );
}

function SakKort({ sak }: { sak: Sak }) {
  return (
    <Box padding="space-4" borderRadius="8" background="raised">
      <HStack justify="space-between" align="start">
        <VStack gap="space-2">
          <HStack gap="space-4" align="center">
            <Link
              to={RouteConfig.FORDELING_DETALJ.replace(":sakId", sak.id)}
              className="navds-link"
            >
              <Heading level="2" size="small">
                Sak {sak.id}
              </Heading>
            </Link>
            <Tag variant={hentStatusVariant(sak.status)} size="small">
              {sak.status}
            </Tag>
          </HStack>

          <HStack gap="space-4">
            <BodyShort size="small" className="text-gray-600">
              Innmeldt: {formaterDato(sak.datoInnmeldt)}
            </BodyShort>
            <BodyShort size="small" className="text-gray-600">
              Kilde: {formaterKilde(sak.kilde)}
            </BodyShort>
            <BodyShort size="small" className="text-gray-600">
              Seksjon: {sak.seksjon}
            </BodyShort>
          </HStack>

          <BodyShort size="small">Ytelser: {sak.ytelser.join(", ")}</BodyShort>
        </VStack>

        <ActionMenu>
          <ActionMenu.Trigger>
            <Button
              variant="tertiary-neutral"
              icon={<MenuElipsisVerticalIcon title="Handlinger" />}
              size="small"
            />
          </ActionMenu.Trigger>
          <ActionMenu.Content>
            <SakHandlinger sakId={sak.id} />
          </ActionMenu.Content>
        </ActionMenu>
      </HStack>
    </Box>
  );
}
