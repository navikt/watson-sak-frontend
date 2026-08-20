import { BodyShort, Detail, HGrid, HStack, Table, Tag, VStack } from "@navikt/ds-react";
import { merkingEtikett } from "~/saker/kategorier";
import { getKategoriText, getMisbrukstyper, getTags } from "~/saker/selectors";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { formaterBelop, formaterYtelseType, getKildeText, getPersonIdent } from "~/saker/visning";
import { formaterOrganisasjonsnummer } from "~/utils/string-utils";
import { PersonIdentMedHistorikk } from "./PersonIdentMedHistorikk";

interface SakDetaljerFelterProps {
  sak: KontrollsakResponse;
  onVisIdentHistorikk: () => void;
}

function Felt({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <VStack gap="space-2">
      <Detail className="text-ax-text-neutral-subtle" uppercase>
        {label}
      </Detail>
      <BodyShort size="small">{children}</BodyShort>
    </VStack>
  );
}

function formaterIsoTilNorskDato(iso: string | undefined | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso ?? "";
  const dag = `${date.getDate()}`.padStart(2, "0");
  const måned = `${date.getMonth() + 1}`.padStart(2, "0");
  const år = date.getFullYear();
  return `${dag}.${måned}.${år}`;
}

function formaterPeriode(fra: string | null | undefined, til: string | null | undefined): string {
  const fraTekst = formaterIsoTilNorskDato(fra);
  const tilTekst = formaterIsoTilNorskDato(til);
  if (fraTekst && tilTekst) return `${fraTekst} – ${tilTekst}`;
  if (fraTekst) return `${fraTekst} –`;
  if (tilTekst) return `– ${tilTekst}`;
  return "–";
}

export function SakDetaljerFelter({ sak, onVisIdentHistorikk }: SakDetaljerFelterProps) {
  const personIdent = getPersonIdent(sak);
  const visPersonIdent = sak.gjeldendePersonIdent ?? personIdent;
  const harHistoriskIdent = sak.historiskeIdenter.some((ident) => ident.historisk);
  const kategoriText = getKategoriText(sak);
  const misbrukstyper = getMisbrukstyper(sak);
  const tags = getTags(sak);
  const kildeTekst = getKildeText(sak);

  return (
    <HGrid columns={{ xs: 1, lg: 2 }} gap="space-6">
      <VStack gap="space-6">
        <VStack gap="space-2">
          <Detail className="text-ax-text-neutral-subtle" uppercase>
            Personnummer
          </Detail>
          <PersonIdentMedHistorikk
            personIdent={visPersonIdent}
            harHistorikk={harHistoriskIdent}
            onVisHistorikk={onVisIdentHistorikk}
          />
          {sak.gjeldendePersonIdent && sak.gjeldendePersonIdent !== sak.personIdent && (
            <Detail className="text-ax-text-neutral-subtle">
              Saken ble opprettet under {personIdent}
            </Detail>
          )}
        </VStack>

        {kategoriText && (
          <VStack gap="space-2">
            <Detail className="text-ax-text-neutral-subtle" uppercase>
              Kategori
            </Detail>
            <div>
              <Tag variant="outline" data-color="info" size="small">
                {kategoriText}
              </Tag>
            </div>
          </VStack>
        )}

        {misbrukstyper.length > 0 && (
          <VStack gap="space-2">
            <Detail className="text-ax-text-neutral-subtle" uppercase>
              Misbrukstype
            </Detail>
            <HStack gap="space-2" wrap>
              {misbrukstyper.map((type) => (
                <Tag key={type} variant="outline" data-color="info" size="small">
                  {type}
                </Tag>
              ))}
            </HStack>
          </VStack>
        )}

        {tags.length > 0 && (
          <VStack gap="space-2">
            <Detail className="text-ax-text-neutral-subtle" uppercase>
              Merking
            </Detail>
            <HStack gap="space-2" wrap>
              {tags.map((tag) => (
                <Tag key={tag} variant="outline" data-color="info" size="small">
                  {merkingEtikett(tag)}
                </Tag>
              ))}
            </HStack>
          </VStack>
        )}

        <Felt label="Kilde">{kildeTekst}</Felt>

        {sak.arbeidsgivere && sak.arbeidsgivere.length > 0 && (
          <Felt label="Organisasjonsnummer">
            {sak.arbeidsgivere.map((orgnr) => formaterOrganisasjonsnummer(orgnr)).join(", ")}
          </Felt>
        )}
      </VStack>

      <VStack gap="space-2">
        {sak.ytelser.length === 0 ? (
          <BodyShort size="small">–</BodyShort>
        ) : (
          <div className="overflow-x-auto">
            <Table size="small" className="[&_td]:py-1 [&_th]:py-1 text-sm">
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell scope="col" className="text-sm">
                    Ytelse
                  </Table.HeaderCell>
                  <Table.HeaderCell scope="col" className="text-sm">
                    Periode
                  </Table.HeaderCell>
                  <Table.HeaderCell scope="col" className="text-sm whitespace-nowrap">
                    Antatt beløp
                  </Table.HeaderCell>
                  <Table.HeaderCell scope="col" className="text-sm whitespace-nowrap">
                    Endelig beløp
                  </Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {sak.ytelser.map((ytelse, indeks) => (
                  <Table.Row key={`${ytelse.type}-${ytelse.periodeFra}-${indeks}`}>
                    <Table.DataCell>
                      <Tag variant="outline" data-color="brand-beige" size="small">
                        {formaterYtelseType(ytelse.type)}
                      </Tag>
                    </Table.DataCell>
                    <Table.DataCell className="text-sm">
                      {formaterPeriode(ytelse.periodeFra, ytelse.periodeTil)}
                    </Table.DataCell>
                    <Table.DataCell className="text-sm">
                      {ytelse.belop !== null && ytelse.belop !== undefined
                        ? formaterBelop(ytelse.belop)
                        : "–"}
                    </Table.DataCell>
                    <Table.DataCell className="text-sm">
                      {ytelse.endeligBelop !== null && ytelse.endeligBelop !== undefined
                        ? formaterBelop(ytelse.endeligBelop)
                        : "–"}
                    </Table.DataCell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        )}
      </VStack>
    </HGrid>
  );
}
