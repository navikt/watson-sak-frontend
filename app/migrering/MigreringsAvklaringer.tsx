import { BodyShort, ExpansionCard, Heading, Link, Table } from "@navikt/ds-react";

export function MigreringsAvklaringer() {
  return (
    <ExpansionCard size="small" aria-label="Målte utvalg og åpne avklaringer">
      <ExpansionCard.Header>
        <ExpansionCard.Title as="h2" size="small">
          Målte utvalg og åpne avklaringer
        </ExpansionCard.Title>
        <ExpansionCard.Description>
          Research fra Access – ikke antall aktive saker eller tall fra mocklisten.
        </ExpansionCard.Description>
      </ExpansionCard.Header>
      <ExpansionCard.Content>
        <div className="flex flex-col gap-4">
          <BodyShort>
            Rapporterte SQL-delutvalg, uten oppgitt uttrekkstidspunkt. Kodene og datoene må vurderes
            sammen. Ingen av tallene er et godkjent migreringsvolum.
          </BodyShort>
          <div className="overflow-x-auto">
            <Table size="small">
              <caption className="sr-only">Målte delutvalg i KT_TABELLPERSON</caption>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell scope="col">Målt kombinasjon</Table.HeaderCell>
                  <Table.HeaderCell scope="col" align="right">
                    Rader
                  </Table.HeaderCell>
                  <Table.HeaderCell scope="col">Forbehold</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                <Table.Row>
                  <Table.DataCell>
                    Utredes + REV-kode, uten FVRES, FVDATO og FERDIGDATO
                  </Table.DataCell>
                  <Table.DataCell align="right">1 396 (674 + 722)</Table.DataCell>
                  <Table.DataCell>Mulig venting eller manglende oppdatering</Table.DataCell>
                </Table.Row>
                <Table.Row>
                  <Table.DataCell>
                    Utredes uten UTREDRES, FVRES, FVDATO og FERDIGDATO
                  </Table.DataCell>
                  <Table.DataCell align="right">580</Table.DataCell>
                  <Table.DataCell>Utredningskandidater etter oppgitt fagregel</Table.DataCell>
                </Table.Row>
                <Table.Row>
                  <Table.DataCell>
                    Utredes uten UTREDRES, FVRES og FVDATO, men med FERDIGDATO
                  </Table.DataCell>
                  <Table.DataCell align="right">4</Table.DataCell>
                  <Table.DataCell>Motstridende signaler – må avklares</Table.DataCell>
                </Table.Row>
              </Table.Body>
            </Table>
          </div>
          <BodyShort>
            REV-koder forekommer også med forvaltningsresultat. Utfylt resultat eller dato betyr
            heller ikke alene at hele saksforløpet er avsluttet. Tallene skal ikke summeres med
            SV-utvalg før kandidatnivå og kobling mellom fasene er avklart.
          </BodyShort>
          <Heading level="3" size="xsmall">
            Tre ubesvarte spørsmål til fagansvarlig
          </Heading>
          <ol className="list-decimal pl-6 space-y-2">
            <li>
              Er de 1 396 revisjonsradene riktig utgangspunkt for forvaltningsrestansen, og hvordan
              finner vi saker som bare mangler oppdatering?
            </li>
            <li>
              Skal utfylt FVRES normalt ta posten ut av «venter på forvaltning», mens videre
              oppfølging håndteres i SV?
            </li>
            <li>
              Hva betyr FERDIGDATO, og hvilken regel gjelder ved manglende eller motstridende
              resultatfelt?
            </li>
          </ol>
          <Link href="https://confluence.adeo.no/pages/viewpage.action?pageId=863618529">
            Se løsningsbeskrivelse og avklaringer i Confluence
          </Link>
        </div>
      </ExpansionCard.Content>
    </ExpansionCard>
  );
}
