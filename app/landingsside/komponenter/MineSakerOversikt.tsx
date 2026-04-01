import { BodyShort, Heading, HStack, Link, Table, Tag, VStack } from "@navikt/ds-react";
import { ArrowRightIcon, FilesIcon } from "@navikt/aksel-icons";
import { Link as RouterLink } from "react-router";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { getSaksreferanse } from "~/saker/id";
import { getOpprettetDato, getStatusVariantForSak } from "~/saker/selectors";
import { getStatus, getYtelseTyper } from "~/saker/visning";
import { RouteConfig } from "~/routeConfig";
import { formaterDato } from "~/utils/date-utils";
import { Kort } from "~/komponenter/Kort";

export function MineSakerOversikt({ saker }: { saker: KontrollsakResponse[] }) {
  return (
    <Kort as="section">
      <VStack gap="space-4">
        <HStack justify="space-between" align="center">
          <HStack gap="space-4" align="center">
            <FilesIcon aria-hidden fontSize="1.25rem" />
            <Heading level="2" size="medium">
              Mine saker
            </Heading>
          </HStack>
          <Link as={RouterLink} to={RouteConfig.MINE_SAKER}>
            Se alle <ArrowRightIcon aria-hidden fontSize="1rem" />
          </Link>
        </HStack>

        {saker.length === 0 ? (
          <BodyShort className="text-ax-text-neutral-subtle">Du har ingen aktive saker.</BodyShort>
        ) : (
          <Table size="medium">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell scope="col">Sak</Table.HeaderCell>
                <Table.HeaderCell scope="col">Ytelse</Table.HeaderCell>
                <Table.HeaderCell scope="col">Status</Table.HeaderCell>
                <Table.HeaderCell scope="col">Innmeldt</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {saker.map((sak) => (
                <Table.Row key={sak.id}>
                  <Table.DataCell>
                    <Link as={RouterLink} to={RouteConfig.SAKER_DETALJ.replace(":sakId", sak.id)}>
                      #{getSaksreferanse(sak.id)}
                    </Link>
                  </Table.DataCell>
                  <Table.DataCell>
                    <BodyShort size="small" truncate className="max-w-32">
                      {getYtelseTyper(sak).join(", ")}
                    </BodyShort>
                  </Table.DataCell>
                  <Table.DataCell>
                    <Tag variant={getStatusVariantForSak(sak)} size="xsmall">
                      {getStatus(sak)}
                    </Tag>
                  </Table.DataCell>
                  <Table.DataCell>
                    <BodyShort size="small">{formaterDato(getOpprettetDato(sak))}</BodyShort>
                  </Table.DataCell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </VStack>
    </Kort>
  );
}
