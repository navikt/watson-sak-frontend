import {
  BodyShort,
  Checkbox,
  CheckboxGroup,
  Heading,
  HStack,
  Table,
  Tag,
  VStack,
} from "@navikt/ds-react";
import { formaterDato } from "~/utils/date-utils";
import { FilIkon } from "~/saker/filer/fil-ikon";
import type { FilNode } from "~/saker/filer/typer";
import type { Journalpost, Journalposttype } from "~/saker/joark/typer";

function journalposttypeVariant(type: Journalposttype) {
  switch (type) {
    case "inngående":
      return "info" as const;
    case "utgående":
      return "warning" as const;
    case "notat":
      return "neutral" as const;
  }
}

/** Flater ut filtreet til en liste med bare filer (ikke mapper) */
function flatUtFiler(noder: FilNode[]): (FilNode & { type: "fil" })[] {
  const filer: (FilNode & { type: "fil" })[] = [];
  for (const node of noder) {
    if (node.type === "fil") {
      filer.push(node);
    } else {
      filer.push(...flatUtFiler(node.barn));
    }
  }
  return filer;
}

interface DokumentVelgerProps {
  filer: FilNode[];
  journalposter: Journalpost[];
  valgteFiler: string[];
  valgteJournalposter: string[];
  onFilerChange: (valgte: string[]) => void;
  onJournalposterChange: (valgte: string[]) => void;
  feil?: string;
}

export function DokumentVelger({
  filer,
  journalposter,
  valgteFiler,
  valgteJournalposter,
  onFilerChange,
  onJournalposterChange,
  feil,
}: DokumentVelgerProps) {
  const alleFiler = flatUtFiler(filer);
  const harFiler = alleFiler.length > 0;
  const harJournalposter = journalposter.length > 0;

  return (
    <VStack gap="space-6">
      <VStack gap="space-2">
        <Heading level="2" size="small">
          Velg dokumenter
        </Heading>
        <BodyShort size="small" className="text-ax-text-neutral-subtle">
          Velg hvilke dokumenter som skal følge med saken. Du må velge minst ett dokument.
        </BodyShort>
        {feil && (
          <BodyShort size="small" className="text-ax-text-danger">
            {feil}
          </BodyShort>
        )}
      </VStack>

      {harFiler && (
        <VStack gap="space-2">
          <Heading level="3" size="xsmall">
            Filer fra Sharepoint
          </Heading>
          <CheckboxGroup
            legend="Velg filer"
            hideLegend
            value={valgteFiler}
            onChange={onFilerChange}
          >
            {alleFiler.map((fil) => (
              <Checkbox key={fil.id} value={fil.id}>
                <HStack gap="space-2" align="center">
                  <FilIkon node={fil} aria-hidden fontSize="1.25rem" />
                  <span>{fil.navn}</span>
                </HStack>
              </Checkbox>
            ))}
          </CheckboxGroup>
        </VStack>
      )}

      {harJournalposter && (
        <VStack gap="space-2">
          <Heading level="3" size="xsmall">
            Journalposter fra Joark
          </Heading>
          <CheckboxGroup
            legend="Velg journalposter"
            hideLegend
            value={valgteJournalposter}
            onChange={onJournalposterChange}
          >
            <Table size="small">
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell scope="col" />
                  <Table.HeaderCell scope="col">Tittel</Table.HeaderCell>
                  <Table.HeaderCell scope="col">Dato</Table.HeaderCell>
                  <Table.HeaderCell scope="col">Type</Table.HeaderCell>
                  <Table.HeaderCell scope="col">Tema</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {journalposter.map((post) => (
                  <Table.Row key={post.journalpostId}>
                    <Table.DataCell>
                      <Checkbox hideLabel value={post.journalpostId}>
                        Velg {post.tittel}
                      </Checkbox>
                    </Table.DataCell>
                    <Table.DataCell>{post.tittel}</Table.DataCell>
                    <Table.DataCell>{formaterDato(post.dato)}</Table.DataCell>
                    <Table.DataCell>
                      <Tag variant={journalposttypeVariant(post.journalposttype)} size="xsmall">
                        {post.journalposttype}
                      </Tag>
                    </Table.DataCell>
                    <Table.DataCell>{post.tema}</Table.DataCell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </CheckboxGroup>
        </VStack>
      )}

      {!harFiler && !harJournalposter && (
        <BodyShort className="text-ax-text-neutral-subtle">
          Ingen dokumenter tilgjengelig for denne saken.
        </BodyShort>
      )}
    </VStack>
  );
}
