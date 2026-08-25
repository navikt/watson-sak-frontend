import { ArchiveIcon } from "@navikt/aksel-icons";
import { BodyShort, Detail, Heading, HStack, Table, Tag, VStack } from "@navikt/ds-react";
import { ÅpneFilKnapp, formaterDato } from "./fil-visning-utils";
import type { FilResponse } from "./typer";

interface ArkivertSeksjonProps {
  /** Filer (opplastede vedlegg og PDF-snapshots generert fra dokumenter) som er arkivert. */
  filer: FilResponse[];
  sakId: string;
}

/**
 * Viser filer (vedlegg og dokument-genererte PDF-er) som er arkivert i en journalpost.
 * Arkiverte filer kan kun åpnes/lastes ned — de kan ikke redigeres eller slettes.
 */
export function ArkivertSeksjon({ filer, sakId }: ArkivertSeksjonProps) {
  if (filer.length === 0) {
    return null;
  }

  const sortert = [...filer].sort((a, b) => (b.arkivert ?? "").localeCompare(a.arkivert ?? ""));

  return (
    <VStack gap="space-4">
      <HStack gap="space-2" align="center">
        <ArchiveIcon aria-hidden />
        <Heading level="2" size="small">
          Arkivert
        </Heading>
      </HStack>

      <Table size="small">
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell scope="col">Filnavn</Table.HeaderCell>
            <Table.HeaderCell scope="col">Arkivert</Table.HeaderCell>
            <Table.HeaderCell scope="col">Av</Table.HeaderCell>
            <Table.HeaderCell scope="col">
              <span className="sr-only">Handlinger</span>
            </Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {sortert.map((fil) => (
            <Table.Row key={fil.id}>
              <Table.DataCell>
                <HStack gap="space-2" align="center">
                  <BodyShort size="small">{fil.filnavn}</BodyShort>
                  <Tag variant="neutral" size="xsmall">
                    Arkivert
                  </Tag>
                </HStack>
              </Table.DataCell>
              <Table.DataCell>
                <Detail>{fil.arkivert ? formaterDato(fil.arkivert) : ""}</Detail>
              </Table.DataCell>
              <Table.DataCell>
                <Detail>{fil.arkivertAv}</Detail>
              </Table.DataCell>
              <Table.DataCell>
                <ÅpneFilKnapp filId={fil.id} filnavn={fil.filnavn} sakId={sakId} />
              </Table.DataCell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </VStack>
  );
}
