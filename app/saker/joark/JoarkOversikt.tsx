import { ExternalLinkIcon, FileSearchIcon } from "@navikt/aksel-icons";
import {
  BodyShort,
  Box,
  Heading,
  HStack,
  Link,
  Pagination,
  Search,
  Table,
  Tag,
  VStack,
} from "@navikt/ds-react";
import { useState } from "react";
import { formaterDato } from "~/utils/date-utils";
import type { Journalpost, Journalposttype } from "./typer";

const POSTER_PER_SIDE = 10;

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

function søkIJournalposter(poster: Journalpost[], søketekst: string): Journalpost[] {
  if (!søketekst.trim()) return poster;

  const søk = søketekst.toLowerCase();
  return poster.filter(
    (post) =>
      post.tittel.toLowerCase().includes(søk) ||
      post.tema.toLowerCase().includes(søk) ||
      post.avsenderMottaker.toLowerCase().includes(søk),
  );
}

interface JoarkOversiktProps {
  journalposter: Journalpost[];
}

export function JoarkOversikt({ journalposter }: JoarkOversiktProps) {
  const [søketekst, setSøketekst] = useState("");
  const [side, setSide] = useState(1);

  const filtrertePoster = søkIJournalposter(journalposter, søketekst);
  const totaleSider = Math.ceil(filtrertePoster.length / POSTER_PER_SIDE);
  const posterPåSiden = filtrertePoster.slice((side - 1) * POSTER_PER_SIDE, side * POSTER_PER_SIDE);

  const visSøkOgPaginering = journalposter.length > POSTER_PER_SIDE;

  function handleSøk(verdi: string) {
    setSøketekst(verdi);
    setSide(1);
  }

  return (
    <Box padding="space-6" borderRadius="8" background="raised">
      <VStack gap="space-4">
        <HStack justify="space-between" align="center">
          <Heading level="2" size="small">
            Journalføringer
          </Heading>
          {visSøkOgPaginering && (
            <BodyShort size="small" className="text-ax-text-neutral-subtle">
              {filtrertePoster.length}{" "}
              {filtrertePoster.length === 1 ? "journalpost" : "journalposter"}
            </BodyShort>
          )}
        </HStack>

        {journalposter.length === 0 ? (
          <VStack gap="space-2" align="center" className="py-8">
            <FileSearchIcon aria-hidden className="text-ax-icon-neutral-subtle" fontSize="2.5rem" />
            <BodyShort className="text-ax-text-neutral-subtle">
              Ingen journalføringer funnet i Joark.
            </BodyShort>
          </VStack>
        ) : (
          <>
            {visSøkOgPaginering && (
              <Search
                label="Søk i journalposter"
                size="small"
                variant="simple"
                value={søketekst}
                onChange={handleSøk}
                onClear={() => handleSøk("")}
              />
            )}

            {filtrertePoster.length === 0 ? (
              <BodyShort className="text-ax-text-neutral-subtle py-4">
                Ingen journalposter samsvarer med søket.
              </BodyShort>
            ) : (
              <Table size="small">
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell scope="col">Tittel</Table.HeaderCell>
                    <Table.HeaderCell scope="col">Dato</Table.HeaderCell>
                    <Table.HeaderCell scope="col">Type</Table.HeaderCell>
                    <Table.HeaderCell scope="col">Tema</Table.HeaderCell>
                    <Table.HeaderCell scope="col">Avsender/mottaker</Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {posterPåSiden.map((post) => (
                    <Table.Row key={post.journalpostId}>
                      <Table.DataCell>
                        <Link href={post.dokumentUrl} target="_blank" rel="noopener noreferrer">
                          <HStack gap="space-1" align="center" wrap={false}>
                            {post.tittel}
                            <span className="sr-only">(åpnes i ny fane)</span>
                            <ExternalLinkIcon aria-hidden fontSize="1rem" />
                          </HStack>
                        </Link>
                      </Table.DataCell>
                      <Table.DataCell>{formaterDato(post.dato)}</Table.DataCell>
                      <Table.DataCell>
                        <Tag variant={journalposttypeVariant(post.journalposttype)} size="xsmall">
                          {post.journalposttype}
                        </Tag>
                      </Table.DataCell>
                      <Table.DataCell>{post.tema}</Table.DataCell>
                      <Table.DataCell>{post.avsenderMottaker}</Table.DataCell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table>
            )}

            {visSøkOgPaginering && totaleSider > 1 && (
              <HStack justify="center">
                <Pagination page={side} onPageChange={setSide} count={totaleSider} size="small" />
              </HStack>
            )}
          </>
        )}
      </VStack>
    </Box>
  );
}
