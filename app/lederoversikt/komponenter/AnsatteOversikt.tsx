import {
  BodyShort,
  Button,
  Heading,
  HStack,
  Link,
  LocalAlert,
  Table,
  VStack,
} from "@navikt/ds-react";
import { useState } from "react";
import { Link as RouterLink } from "react-router";
import { ArrowRightIcon } from "@navikt/aksel-icons";
import { Kort } from "~/komponenter/Kort";
import { KolonneHeading, type Sorteringsretning } from "~/saker/saksliste/KolonneHeading";
import { RouteConfig } from "~/routeConfig";
import {
  LEDERSTATISTIKK_STATUSER,
  type LederAnsatteStatistikk,
  type LederAnsattStatistikk,
} from "../types";

type SortKolonne = "navn" | "antall";
type Sortering = { kolonne: SortKolonne; retning: Sorteringsretning };

const STANDARD_ANTALL_SYNLIGE = 8;
const STANDARD_SORTERING: Sortering = { kolonne: "antall", retning: "synkende" };

function sorterAnsatte(
  ansatte: LederAnsattStatistikk[],
  sortering: Sortering,
): LederAnsattStatistikk[] {
  const faktor = sortering.retning === "stigende" ? 1 : -1;

  return [...ansatte].sort((a, b) => {
    if (sortering.kolonne === "navn") {
      return a.navn.localeCompare(b.navn, "nb") * faktor;
    }
    return (a.totaltAntallIkkeAvsluttede - b.totaltAntallIkkeAvsluttede) * faktor;
  });
}

function ariaSortForKolonne(
  kolonne: SortKolonne,
  sortering: Sortering,
): "ascending" | "descending" | "none" {
  if (sortering.kolonne !== kolonne) return "none";
  return sortering.retning === "stigende" ? "ascending" : "descending";
}

function lagAnsattLenke(enhetId: string, navIdent: string): string {
  const parametere = new URLSearchParams({ enhet: enhetId, saksbehandler: navIdent });
  LEDERSTATISTIKK_STATUSER.forEach((status) => parametere.append("status", status));
  return `${RouteConfig.ALLE_SAKER}?${parametere}`;
}

/** Viser antall saker per saksbehandler i enheten som en horisontal stolpe,
 * delt i innenfor frist (blå) og over frist (rød). Bygget som en vanlig
 * tabell (ikke et grafikkbibliotek) slik at den forblir tastatur- og
 * skjermleser-tilgjengelig, samtidig som den gir samme visuelle inntrykk som
 * et stolpediagram. */
export function AnsatteOversikt({
  ansatte,
  enhetId,
}: {
  ansatte: LederAnsatteStatistikk;
  enhetId: string;
}) {
  const [sortering, setSortering] = useState<Sortering>(STANDARD_SORTERING);
  const [visAlle, setVisAlle] = useState(false);

  const sorterte = sorterAnsatte(ansatte.liste, sortering);
  const synlige = visAlle ? sorterte : sorterte.slice(0, STANDARD_ANTALL_SYNLIGE);
  const maksAntall = Math.max(
    1,
    ansatte.ufordelt.totaltAntallIkkeAvsluttede,
    ...ansatte.liste.map((ansatt) => ansatt.totaltAntallIkkeAvsluttede),
  );
  const kanViseFærre = ansatte.liste.length > STANDARD_ANTALL_SYNLIGE;

  function sorterPå(kolonne: SortKolonne) {
    setSortering((forrige) => {
      if (forrige.kolonne !== kolonne) {
        return { kolonne, retning: kolonne === "navn" ? "stigende" : "synkende" };
      }
      return { kolonne, retning: forrige.retning === "stigende" ? "synkende" : "stigende" };
    });
  }

  return (
    <Kort as="section">
      <VStack gap="space-4">
        <HStack justify="space-between" align="center" wrap>
          <VStack gap="space-1">
            <Heading level="2" size="small">
              Ansattoversikt
            </Heading>
            <BodyShort size="small" className="text-ax-text-neutral-subtle">
              Viser {synlige.length} av {ansatte.liste.length}
            </BodyShort>
          </VStack>
          <HStack gap="space-4" align="center">
            <Tegnforklaring farge="bg-ax-bg-accent-strong" tekst="Innenfor frist" />
            <Tegnforklaring farge="bg-ax-bg-danger-strong" tekst="Over frist" />
          </HStack>
        </HStack>

        {!ansatte.tilgjengelig && (
          <LocalAlert status="warning">
            <LocalAlert.Content>
              Ansattlisten er midlertidig utilgjengelig. Sakstallene for enheten vises fortsatt.
            </LocalAlert.Content>
          </LocalAlert>
        )}

        {ansatte.tilgjengelig && ansatte.liste.length === 0 ? (
          <BodyShort className="text-ax-text-neutral-subtle">
            Fant ingen saksbehandlere i enheten.
          </BodyShort>
        ) : null}

        {(ansatte.liste.length > 0 || ansatte.ufordelt.totaltAntallIkkeAvsluttede > 0) && (
          <>
            <Table size="small">
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell
                    scope="col"
                    className="w-1/3"
                    aria-sort={ariaSortForKolonne("navn", sortering)}
                  >
                    <KolonneHeading
                      tittel="Saksbehandler"
                      sortering={{
                        aktiv: sortering.kolonne === "navn",
                        retning: sortering.kolonne === "navn" ? sortering.retning : null,
                        onSort: () => sorterPå("navn"),
                      }}
                    />
                  </Table.HeaderCell>
                  <Table.HeaderCell scope="col" aria-sort={ariaSortForKolonne("antall", sortering)}>
                    <KolonneHeading
                      tittel="Antall aktive saker"
                      sortering={{
                        aktiv: sortering.kolonne === "antall",
                        retning: sortering.kolonne === "antall" ? sortering.retning : null,
                        onSort: () => sorterPå("antall"),
                      }}
                    />
                  </Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {synlige.map((ansatt) => (
                  <Table.Row key={ansatt.navIdent}>
                    <Table.DataCell>
                      <VStack gap="space-1">
                        <Link as={RouterLink} to={lagAnsattLenke(enhetId, ansatt.navIdent)}>
                          {ansatt.navn}
                        </Link>
                        <BodyShort size="small" className="text-ax-text-neutral-subtle">
                          {ansatt.navIdent}
                        </BodyShort>
                      </VStack>
                    </Table.DataCell>
                    <Table.DataCell>
                      <AnsattStolpe ansatt={ansatt} maksAntall={maksAntall} />
                    </Table.DataCell>
                  </Table.Row>
                ))}
                <Table.Row>
                  <Table.DataCell>Ufordelt</Table.DataCell>
                  <Table.DataCell>
                    <AnsattStolpe ansatt={ansatte.ufordelt} maksAntall={maksAntall} />
                  </Table.DataCell>
                </Table.Row>
              </Table.Body>
            </Table>

            {kanViseFærre && (
              <HStack justify="end">
                <Button
                  type="button"
                  variant="tertiary"
                  size="small"
                  icon={visAlle ? undefined : <ArrowRightIcon aria-hidden />}
                  iconPosition="right"
                  onClick={() => setVisAlle((v) => !v)}
                >
                  {visAlle ? "Vis færre" : `Vis alle saksbehandlere (${ansatte.liste.length})`}
                </Button>
              </HStack>
            )}
          </>
        )}
      </VStack>
    </Kort>
  );
}

function Tegnforklaring({ farge, tekst }: { farge: string; tekst: string }) {
  return (
    <HStack gap="space-2" align="center">
      <span aria-hidden className={`inline-block h-3 w-3 rounded-xs ${farge}`} />
      <BodyShort size="small" className="text-ax-text-neutral-subtle">
        {tekst}
      </BodyShort>
    </HStack>
  );
}

function AnsattStolpe({
  ansatt,
  maksAntall,
}: {
  ansatt: {
    totaltAntallIkkeAvsluttede: number;
    antallOverFrist: number;
  };
  maksAntall: number;
}) {
  const bredde = (antall: number) => `${(antall / maksAntall) * 100}%`;
  const innenforFrist = ansatt.totaltAntallIkkeAvsluttede - ansatt.antallOverFrist;

  return (
    <HStack gap="space-4" align="center">
      <div
        role="img"
        aria-label={`${innenforFrist} innenfor frist og ${ansatt.antallOverFrist} over frist, av totalt ${ansatt.totaltAntallIkkeAvsluttede} saker`}
        className="flex h-4 min-w-24 flex-1 overflow-hidden rounded-sm bg-ax-bg-neutral-moderate"
      >
        {innenforFrist > 0 && (
          <div
            className="h-full bg-ax-bg-accent-strong"
            style={{ width: bredde(innenforFrist) }}
          />
        )}
        {ansatt.antallOverFrist > 0 && (
          <div
            className="h-full bg-ax-bg-danger-strong"
            style={{ width: bredde(ansatt.antallOverFrist) }}
          />
        )}
      </div>
      <BodyShort size="small" className="w-6 shrink-0 text-right tabular-nums">
        {ansatt.totaltAntallIkkeAvsluttede}
      </BodyShort>
    </HStack>
  );
}
