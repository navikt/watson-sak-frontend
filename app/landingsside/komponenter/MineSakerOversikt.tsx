import { BodyShort, Heading, Link, Table, Tag, VStack } from "@navikt/ds-react";
import { ArrowRightIcon } from "@navikt/aksel-icons";
import { Link as RouterLink } from "react-router";
import type { Sak } from "~/saker/typer";
import { hentStatusVariant } from "~/saker/utils";
import { RouteConfig } from "~/routeConfig";
import { Kort } from "~/utils/Kort";

export function MineSakerOversikt({ saker }: { saker: Sak[] }) {
  return (
    <Kort as="section">
      <VStack gap="space-4">
        <div className="flex items-center justify-between">
          <Heading level="2" size="medium">
            Mine saker
          </Heading>
          <Link as={RouterLink} to={RouteConfig.MINE_SAKER}>
            Se alle <ArrowRightIcon aria-hidden fontSize="1rem" />
          </Link>
        </div>

        {saker.length === 0 ? (
          <BodyShort className="text-ax-text-neutral-subtle">
            Du har ingen aktive saker.
          </BodyShort>
        ) : (
          <Table size="small">
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
                    <Link
                      as={RouterLink}
                      to={RouteConfig.SAKER_DETALJ.replace(":sakId", sak.id)}
                    >
                      #{sak.id}
                    </Link>
                  </Table.DataCell>
                  <Table.DataCell>
                    <BodyShort size="small" truncate className="max-w-32">
                      {sak.ytelser.join(", ")}
                    </BodyShort>
                  </Table.DataCell>
                  <Table.DataCell>
                    <Tag
                      variant={hentStatusVariant(sak.status)}
                      size="xsmall"
                    >
                      {sak.status}
                    </Tag>
                  </Table.DataCell>
                  <Table.DataCell>
                    <BodyShort size="small">
                      {new Date(sak.datoInnmeldt).toLocaleDateString("nb-NO")}
                    </BodyShort>
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
