import { BodyShort, Box, Heading, HGrid, Page, Table, VStack } from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { useLoaderData } from "react-router";
import {
  beregnAntallPerSeksjon,
  beregnAntallPerStatus,
  beregnBehandlingstid,
  beregnFordelingPerAntallYtelser,
  beregnFordelingPerYtelse,
  type GruppertAntall,
} from "./beregninger";
import { mockAvslutningsdatoer, mockStatistikkSaker } from "./mock-data.server";

export function loader() {
  const saker = mockStatistikkSaker;

  return {
    totaltAntall: saker.length,
    antallPerStatus: beregnAntallPerStatus(saker),
    behandlingstid: beregnBehandlingstid(saker, mockAvslutningsdatoer),
    antallPerSeksjon: beregnAntallPerSeksjon(saker),
    fordelingPerYtelse: beregnFordelingPerYtelse(saker),
    fordelingPerAntallYtelser: beregnFordelingPerAntallYtelser(saker),
  };
}

export default function StatistikkSide() {
  const {
    totaltAntall,
    antallPerStatus,
    behandlingstid,
    antallPerSeksjon,
    fordelingPerYtelse,
    fordelingPerAntallYtelser,
  } = useLoaderData<typeof loader>();

  return (
    <Page>
      <title>Statistikk – Watson Sak</title>
      <PageBlock width="lg" gutters>
        <VStack gap="space-8" className="mt-4 mb-8">
          <Heading level="1" size="large">
            Statistikk
          </Heading>

          <section aria-labelledby="nøkkeltall-heading">
            <Heading level="2" size="medium" spacing id="nøkkeltall-heading">
              Nøkkeltall
            </Heading>
            <HGrid columns={{ xs: 2, md: 4 }} gap="space-4">
              <NøkkeltallKort tittel="Totalt" verdi={totaltAntall} />
              <NøkkeltallKort tittel="Under utredning" verdi={antallPerStatus["under utredning"]} />
              <NøkkeltallKort tittel="Avsluttet" verdi={antallPerStatus.avsluttet} />
              <NøkkeltallKort tittel="Henlagt" verdi={antallPerStatus.henlagt} />
            </HGrid>
          </section>

          <section aria-labelledby="status-heading">
            <Heading level="2" size="medium" spacing id="status-heading">
              Saker per status
            </Heading>
            <FordelingTabell
              rader={Object.entries(antallPerStatus).map(([navn, antall]) => ({
                navn,
                antall,
              }))}
              totalt={totaltAntall}
            />
          </section>

          {behandlingstid && (
            <section aria-labelledby="behandlingstid-heading">
              <Heading level="2" size="medium" spacing id="behandlingstid-heading">
                Behandlingstid (dager)
              </Heading>
              <BodyShort spacing className="text-ax-text-neutral-subtle">
                Basert på {behandlingstid.antall} avsluttede/henlagte saker
              </BodyShort>
              <HGrid columns={{ xs: 2, md: 4 }} gap="space-4">
                <NøkkeltallKort tittel="Minimum" verdi={behandlingstid.min} enhet="dager" />
                <NøkkeltallKort tittel="Median" verdi={behandlingstid.median} enhet="dager" />
                <NøkkeltallKort
                  tittel="Gjennomsnitt"
                  verdi={behandlingstid.gjennomsnitt}
                  enhet="dager"
                />
                <NøkkeltallKort tittel="Maksimum" verdi={behandlingstid.maks} enhet="dager" />
              </HGrid>
            </section>
          )}

          <section aria-labelledby="seksjon-heading">
            <Heading level="2" size="medium" spacing id="seksjon-heading">
              Saker per seksjon
            </Heading>
            <FordelingTabell rader={antallPerSeksjon} totalt={totaltAntall} />
          </section>

          <section aria-labelledby="ytelse-heading">
            <Heading level="2" size="medium" spacing id="ytelse-heading">
              Fordeling per ytelse
            </Heading>
            <BodyShort spacing className="text-ax-text-neutral-subtle">
              En sak kan ha flere ytelser, så summen kan overstige totalt antall saker
            </BodyShort>
            <FordelingTabell rader={fordelingPerYtelse} />
          </section>

          <section aria-labelledby="antall-ytelser-heading">
            <Heading level="2" size="medium" spacing id="antall-ytelser-heading">
              Fordeling per antall ytelser
            </Heading>
            <FordelingTabell rader={fordelingPerAntallYtelser} totalt={totaltAntall} />
          </section>
        </VStack>
      </PageBlock>
    </Page>
  );
}

function NøkkeltallKort({
  tittel,
  verdi,
  enhet,
}: {
  tittel: string;
  verdi: number;
  enhet?: string;
}) {
  return (
    <Box padding="space-4" borderRadius="8" background="raised">
      <BodyShort size="small" className="text-ax-text-neutral-subtle">
        {tittel}
      </BodyShort>
      <span className="text-3xl font-semibold">{verdi}</span>
      {enhet && (
        <BodyShort size="small" className="text-ax-text-neutral-subtle" as="span">
          {" "}
          {enhet}
        </BodyShort>
      )}
    </Box>
  );
}

function FordelingTabell({ rader, totalt }: { rader: GruppertAntall[]; totalt?: number }) {
  const maksAntall = totalt ?? Math.max(...rader.map((r) => r.antall), 1);

  return (
    <Table size="small">
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell scope="col">Navn</Table.HeaderCell>
          <Table.HeaderCell scope="col" align="right">
            Antall
          </Table.HeaderCell>
          <Table.HeaderCell scope="col">Andel</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {rader.map((rad) => {
          const prosentandel = Math.round((rad.antall / maksAntall) * 100);
          return (
            <Table.Row key={rad.navn}>
              <Table.DataCell className="capitalize">{rad.navn}</Table.DataCell>
              <Table.DataCell align="right">{rad.antall}</Table.DataCell>
              <Table.DataCell>
                <div className="flex items-center gap-2">
                  <div
                    className="h-4 rounded bg-ax-bg-accent-soft"
                    style={{ width: `${prosentandel}%`, minWidth: "2px" }}
                  />
                  <BodyShort size="small" className="text-ax-text-neutral-subtle">
                    {prosentandel} %
                  </BodyShort>
                </div>
              </Table.DataCell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table>
  );
}
