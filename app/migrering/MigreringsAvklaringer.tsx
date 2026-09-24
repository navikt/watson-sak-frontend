import { BodyShort, ExpansionCard, Heading, Link, Table } from "@navikt/ds-react";

export function MigreringsAvklaringer() {
  return (
    <ExpansionCard size="small" aria-label="Målte utvalg og statusregler">
      <ExpansionCard.Header>
        <ExpansionCard.Title as="h2" size="small">
          Målte utvalg og statusregler
        </ExpansionCard.Title>
        <ExpansionCard.Description>
          Kriterier og tallgrunnlag per 23.09.2026 for overføring til Watson Sak.
        </ExpansionCard.Description>
      </ExpansionCard.Header>
      <ExpansionCard.Content>
        <div className="flex flex-col gap-4">
          <BodyShort>
            Beslutningstabell for saker som overføres til nytt saksbehandlingssystem. Kilde og PID
            holdes adskilt for hver tabell.
          </BodyShort>
          <div className="overflow-x-auto">
            <Table size="small">
              <caption className="sr-only">Kategorier og forventet antall</caption>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell scope="col">Kategori</Table.HeaderCell>
                  <Table.HeaderCell scope="col">Kildetabell</Table.HeaderCell>
                  <Table.HeaderCell scope="col" align="right">
                    Forventet antall
                  </Table.HeaderCell>
                  <Table.HeaderCell scope="col">Regel</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                <Table.Row>
                  <Table.HeaderCell scope="row">Tipsrestanser</Table.HeaderCell>
                  <Table.DataCell>KT_TABELLPERSON</Table.DataCell>
                  <Table.DataCell align="right">586</Table.DataCell>
                  <Table.DataCell>TIPSINNDATO satt, UTREDRES mangler</Table.DataCell>
                </Table.Row>
                <Table.Row>
                  <Table.HeaderCell scope="row">Tips venter resultat</Table.HeaderCell>
                  <Table.DataCell>KT_TABELLPERSON</Table.DataCell>
                  <Table.DataCell align="right">612</Table.DataCell>
                  <Table.DataCell>
                    REV-koder, FVRES mangler, ekskl. Spania og Analyse
                  </Table.DataCell>
                </Table.Row>
                <Table.Row>
                  <Table.HeaderCell scope="row">Straffesaker restanser</Table.HeaderCell>
                  <Table.DataCell>KT_TABELLPERSONSTRAFF</Table.DataCell>
                  <Table.DataCell align="right">420 (434)</Table.DataCell>
                  <Table.DataCell>SVMOTTATT satt, SVRES mangler</Table.DataCell>
                </Table.Row>
                <Table.Row>
                  <Table.HeaderCell scope="row">Straffesaker venter på resultat</Table.HeaderCell>
                  <Table.DataCell>KT_TABELLPERSONSTRAFF</Table.DataCell>
                  <Table.DataCell align="right">637</Table.DataCell>
                  <Table.DataCell>
                    Anmeldt/Anm. Agiver, POLDOMDATO mangler, f.o.m. 2020, ekskl. KA
                  </Table.DataCell>
                </Table.Row>
                <Table.Row>
                  <Table.HeaderCell scope="row">Registersamkjøring dagpenger</Table.HeaderCell>
                  <Table.DataCell>NKA_KONTROLL</Table.DataCell>
                  <Table.DataCell align="right">77</Table.DataCell>
                  <Table.DataCell>RESULTAT = UNDER ARBEID</Table.DataCell>
                </Table.Row>
                <Table.Row>
                  <Table.HeaderCell scope="row">Registersamkjøring AAP</Table.HeaderCell>
                  <Table.DataCell>NKA_KONTROLL_AAP</Table.DataCell>
                  <Table.DataCell align="right">60</Table.DataCell>
                  <Table.DataCell>RESULTAT = UNDER ARBEID</Table.DataCell>
                </Table.Row>
              </Table.Body>
            </Table>
          </div>
          <Heading level="3" size="xsmall">
            Spesielle merknader
          </Heading>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Arbeidsgiveranmeldelser:</strong> SVRES = 'Anm. Agiver' holdes utenfor
              offisiell statistikk om trygdemisbruk.
            </li>
            <li>
              <strong>FERDIGDATO:</strong> Brukes ikke i statusreglene.
            </li>
            <li>
              <strong>Saksbehandleransvar:</strong> Saker uten registrert saksbehandler tilordnes
              enhet.
            </li>
          </ul>
          <Link href="https://confluence.adeo.no/pages/viewpage.action?pageId=863618529">
            Se full løsningsbeskrivelse og beslutningstabell i Confluence
          </Link>
        </div>
      </ExpansionCard.Content>
    </ExpansionCard>
  );
}
