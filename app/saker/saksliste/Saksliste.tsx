import { BodyShort, HStack, Link, Table, Tag } from "@navikt/ds-react";
import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router";
import { formaterDato } from "~/utils/date-utils";

type SakslisteKolonne = "saksid" | "navn" | "kategori" | "misbrukstype" | "opprettet" | "oppdatert";

export type SakslisteRad = {
  id: string;
  saksreferanse: string;
  detaljHref?: string;
  navn: string | null;
  kategori: string | null;
  misbrukstyper: string[];
  opprettet: string;
  oppdatert: string | null;
};

type SakslisteProps = {
  rader: SakslisteRad[];
  kolonner?: SakslisteKolonne[];
  tomTekst: string;
  size?: "small" | "medium";
  renderRadHandling?: (rad: SakslisteRad) => ReactNode;
  handlingKolonneTittel?: ReactNode;
  kolonneHeaderInnhold?: Partial<Record<SakslisteKolonne, ReactNode>>;
  kolonneHeaderProps?: Partial<
    Record<
      SakslisteKolonne,
      { className?: string; "aria-sort"?: "ascending" | "descending" | "none" }
    >
  >;
};

const standardKolonner: SakslisteKolonne[] = [
  "saksid",
  "navn",
  "kategori",
  "misbrukstype",
  "opprettet",
  "oppdatert",
];

const standardTitler: Record<SakslisteKolonne, string> = {
  saksid: "Saksid",
  navn: "Navn",
  kategori: "Kategori",
  misbrukstype: "Misbrukstype",
  opprettet: "Opprettet",
  oppdatert: "Oppdatert",
};

export function Saksliste({
  rader,
  kolonner = standardKolonner,
  tomTekst,
  size = "medium",
  renderRadHandling,
  handlingKolonneTittel,
  kolonneHeaderInnhold,
  kolonneHeaderProps,
}: SakslisteProps) {
  if (rader.length === 0) {
    return <BodyShort className="text-ax-text-neutral-subtle">{tomTekst}</BodyShort>;
  }

  return (
    <Table size={size}>
      <Table.Header>
        <Table.Row>
          {kolonner.map((kolonne) => (
            <Table.HeaderCell key={kolonne} scope="col" {...kolonneHeaderProps?.[kolonne]}>
              {kolonneHeaderInnhold?.[kolonne] ?? standardTitler[kolonne]}
            </Table.HeaderCell>
          ))}
          {renderRadHandling ? (
            <Table.HeaderCell scope="col">
              {handlingKolonneTittel ?? <span className="sr-only">Handling</span>}
            </Table.HeaderCell>
          ) : null}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {rader.map((rad) => (
          <Table.Row key={rad.id}>
            {kolonner.map((kolonne) => (
              <Table.DataCell key={kolonne}>{renderCelle(rad, kolonne)}</Table.DataCell>
            ))}
            {renderRadHandling ? <Table.DataCell>{renderRadHandling(rad)}</Table.DataCell> : null}
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}

function renderCelle(rad: SakslisteRad, kolonne: SakslisteKolonne) {
  switch (kolonne) {
    case "saksid":
      return rad.detaljHref ? (
        <Link as={RouterLink} to={rad.detaljHref}>
          {rad.saksreferanse}
        </Link>
      ) : (
        <BodyShort size="small">{rad.saksreferanse}</BodyShort>
      );
    case "navn":
      return (
        <BodyShort size="small" truncate className="max-w-48">
          {rad.navn ?? "–"}
        </BodyShort>
      );
    case "kategori":
      return rad.kategori ? (
        <Tag variant="neutral" size="small">
          {rad.kategori}
        </Tag>
      ) : (
        <BodyShort size="small">–</BodyShort>
      );
    case "misbrukstype":
      return rad.misbrukstyper.length > 0 ? (
        <HStack gap="space-2" wrap>
          {rad.misbrukstyper.map((misbrukstype) => (
            <Tag key={misbrukstype} variant="warning" size="small">
              {misbrukstype}
            </Tag>
          ))}
        </HStack>
      ) : (
        <BodyShort size="small">–</BodyShort>
      );
    case "opprettet":
      return <BodyShort size="small">{formaterDato(rad.opprettet)}</BodyShort>;
    case "oppdatert":
      return <BodyShort size="small">{formaterDato(rad.oppdatert ?? rad.opprettet)}</BodyShort>;
  }
}
