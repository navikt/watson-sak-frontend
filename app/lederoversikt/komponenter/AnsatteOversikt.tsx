import { BodyShort, Button, Heading, HStack, Link, Table, VStack } from "@navikt/ds-react";
import { PersonGroupIcon } from "@navikt/aksel-icons";
import { useState } from "react";
import { Link as RouterLink } from "react-router";
import { Kort } from "~/komponenter/Kort";
import { KolonneHeading, type Sorteringsretning } from "~/saker/saksliste/KolonneHeading";
import { RouteConfig } from "~/routeConfig";
import type { AnsattOversikt } from "../beregninger";

type SortKolonne = "navn" | "antall";
type Sortering = { kolonne: SortKolonne; retning: Sorteringsretning };

const STANDARD_ANTALL_SYNLIGE = 8;
const STANDARD_SORTERING: Sortering = { kolonne: "antall", retning: "synkende" };

function sorterAnsatte(ansatte: AnsattOversikt[], sortering: Sortering): AnsattOversikt[] {
  const faktor = sortering.retning === "stigende" ? 1 : -1;

  return [...ansatte].sort((a, b) => {
    if (sortering.kolonne === "navn") {
      return a.navn.localeCompare(b.navn, "nb") * faktor;
    }
    return (a.totalAntall - b.totalAntall) * faktor;
  });
}

function ariaSortForKolonne(
  kolonne: SortKolonne,
  sortering: Sortering,
): "ascending" | "descending" | "none" {
  if (sortering.kolonne !== kolonne) return "none";
  return sortering.retning === "stigende" ? "ascending" : "descending";
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
  ansatte: AnsattOversikt[];
  enhetId: string;
}) {
  const [sortering, setSortering] = useState<Sortering>(STANDARD_SORTERING);
  const [visAlle, setVisAlle] = useState(false);

  const sorterte = sorterAnsatte(ansatte, sortering);
  const synlige = visAlle ? sorterte : sorterte.slice(0, STANDARD_ANTALL_SYNLIGE);
  const maksAntall = Math.max(1, ...ansatte.map((ansatt) => ansatt.totalAntall));
  const kanViseFærre = ansatte.length > STANDARD_ANTALL_SYNLIGE;

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
          <HStack gap="space-4" align="center">
            <PersonGroupIcon aria-hidden fontSize="1.25rem" />
            <Heading level="2" size="medium">
              Saker per saksbehandler
            </Heading>
          </HStack>
          <HStack gap="space-4" align="center">
            <Tegnforklaring farge="bg-ax-bg-info-strong" tekst="Innenfor frist" />
            <Tegnforklaring farge="bg-ax-bg-danger-strong" tekst="Over frist" />
          </HStack>
        </HStack>

        {ansatte.length === 0 ? (
          <BodyShort className="text-ax-text-neutral-subtle">
            Fant ingen saksbehandlere i enheten.
          </BodyShort>
        ) : (
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
                      tittel="Saker"
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
                      <Link
                        as={RouterLink}
                        to={`${RouteConfig.ALLE_SAKER}?enhet=${enhetId}&saksbehandler=${ansatt.navIdent}`}
                      >
                        {ansatt.navn}
                      </Link>
                    </Table.DataCell>
                    <Table.DataCell>
                      <AnsattStolpe ansatt={ansatt} maksAntall={maksAntall} />
                    </Table.DataCell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>

            {kanViseFærre && (
              <HStack justify="end">
                <Button
                  type="button"
                  variant="tertiary"
                  size="small"
                  onClick={() => setVisAlle((v) => !v)}
                >
                  {visAlle ? "Vis færre" : `Vis alle (${ansatte.length})`}
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
      <span aria-hidden className={`inline-block h-3 w-3 rounded-full ${farge}`} />
      <BodyShort size="small" className="text-ax-text-neutral-subtle">
        {tekst}
      </BodyShort>
    </HStack>
  );
}

function AnsattStolpe({ ansatt, maksAntall }: { ansatt: AnsattOversikt; maksAntall: number }) {
  const bredde = (antall: number) => `${(antall / maksAntall) * 100}%`;

  return (
    <HStack gap="space-4" align="center">
      <div
        role="img"
        aria-label={`${ansatt.innenforFrist} innenfor frist og ${ansatt.overFrist} over frist, av totalt ${ansatt.totalAntall} saker`}
        className="flex h-4 min-w-24 flex-1 overflow-hidden rounded-sm bg-ax-bg-neutral-moderate"
      >
        {ansatt.innenforFrist > 0 && (
          <div
            className="h-full bg-ax-bg-info-strong"
            style={{ width: bredde(ansatt.innenforFrist) }}
          />
        )}
        {ansatt.overFrist > 0 && (
          <div
            className="h-full bg-ax-bg-danger-strong"
            style={{ width: bredde(ansatt.overFrist) }}
          />
        )}
      </div>
      <BodyShort size="small" className="w-6 shrink-0 text-right tabular-nums">
        {ansatt.totalAntall}
      </BodyShort>
    </HStack>
  );
}
