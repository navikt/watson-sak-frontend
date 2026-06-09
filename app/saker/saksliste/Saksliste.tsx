import { BodyShort, Link, Table, Tag } from "@navikt/ds-react";
import type { ReactNode } from "react";
import { Link as RouterLink, useNavigate } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import type { Tilbakemål } from "~/saker/tilbake";
import { formaterDato } from "~/utils/date-utils";
import { KolonneHeading, type Sorteringsretning } from "./KolonneHeading";
import { TagOverflow } from "./TagOverflow";

type SakslisteKolonne =
  | "saksid"
  | "navn"
  | "kategori"
  | "misbrukstype"
  | "status"
  | "opprettet"
  | "oppdatert"
  | "saksbehandler";

export type SakslisteRad = {
  id: number;
  saksreferanse: string;
  detaljHref?: string;
  navn: string | null;
  kategori: string | null;
  misbrukstyper: string[];
  status: string | null;
  ventestatus: string | null;
  opprettet: string;
  oppdatert: string | null;
  saksbehandler: string | null;
};

export type SakslisteSortering = {
  kolonne: SakslisteKolonne | null;
  retning: Sorteringsretning | null;
  onSort: (kolonne: SakslisteKolonne) => void;
  sorterbare: SakslisteKolonne[];
};

type SakslisteProps = {
  rader: SakslisteRad[];
  kolonner?: SakslisteKolonne[];
  tomTekst: string;
  size?: "small" | "medium";
  renderRadHandling?: (rad: SakslisteRad) => ReactNode;
  handlingKolonneTittel?: ReactNode;
  sortering?: SakslisteSortering;
  /** Opphav som følger med til saken, slik at sakens «tilbake»-knapp fører hit. */
  tilbake?: Tilbakemål;
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
  "status",
  "opprettet",
  "oppdatert",
];

const standardTitler: Record<SakslisteKolonne, string> = {
  saksid: "Saksid",
  navn: "Navn",
  kategori: "Kategori",
  misbrukstype: "Misbrukstype",
  status: "Status",
  opprettet: "Opprettet",
  oppdatert: "Oppdatert",
  saksbehandler: "Saksbehandler",
};

export function Saksliste({
  rader,
  kolonner = standardKolonner,
  tomTekst,
  size = "medium",
  renderRadHandling,
  handlingKolonneTittel,
  sortering,
  tilbake,
  kolonneHeaderInnhold,
  kolonneHeaderProps,
}: SakslisteProps) {
  const navigate = useNavigate();
  const lenkeState = tilbake ? { tilbake } : undefined;

  if (rader.length === 0) {
    return <BodyShort className="text-ax-text-neutral-subtle">{tomTekst}</BodyShort>;
  }

  return (
    <Table size={size}>
      <Table.Header>
        <Table.Row>
          {kolonner.map((kolonne) => (
            <Table.HeaderCell
              key={kolonne}
              scope="col"
              {...hentHeaderCellProps(kolonne, sortering, kolonneHeaderProps)}
            >
              {kolonneHeaderInnhold?.[kolonne] ?? hentHeaderInnhold(kolonne, sortering)}
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
          <Table.Row
            key={rad.id}
            onClick={
              rad.detaljHref
                ? () => {
                    sporHendelse("sak åpnet");
                    navigate(rad.detaljHref ?? "", { state: lenkeState });
                  }
                : undefined
            }
            className={rad.detaljHref ? "cursor-pointer" : undefined}
          >
            {kolonner.map((kolonne) => (
              <Table.DataCell key={kolonne}>{renderCelle(rad, kolonne, lenkeState)}</Table.DataCell>
            ))}
            {renderRadHandling ? <Table.DataCell>{renderRadHandling(rad)}</Table.DataCell> : null}
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}

function renderCelle(
  rad: SakslisteRad,
  kolonne: SakslisteKolonne,
  lenkeState?: { tilbake: Tilbakemål },
) {
  switch (kolonne) {
    case "saksid":
      return rad.detaljHref ? (
        <Link as={RouterLink} to={rad.detaljHref} state={lenkeState}>
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
        <Tag variant="outline" data-color="info" size="small">
          {rad.kategori}
        </Tag>
      ) : (
        <BodyShort size="small">–</BodyShort>
      );
    case "misbrukstype":
      return (
        <TagOverflow tags={rad.misbrukstyper} tomInnhold={<BodyShort size="small">–</BodyShort>} />
      );
    case "status":
      return rad.ventestatus ? (
        <Tag variant="outline" data-color="warning" size="small">
          {rad.ventestatus}
        </Tag>
      ) : rad.status ? (
        <Tag variant="outline" data-color="success" size="small">
          {rad.status}
        </Tag>
      ) : (
        <BodyShort size="small">–</BodyShort>
      );
    case "opprettet":
      return <BodyShort size="small">{formaterDato(rad.opprettet)}</BodyShort>;
    case "oppdatert":
      return <BodyShort size="small">{formaterDato(rad.oppdatert ?? rad.opprettet)}</BodyShort>;
    case "saksbehandler":
      return <BodyShort size="small">{rad.saksbehandler ?? "–"}</BodyShort>;
  }
}

function hentHeaderInnhold(kolonne: SakslisteKolonne, sortering?: SakslisteSortering): ReactNode {
  const tittel = standardTitler[kolonne];

  if (!sortering) {
    return <KolonneHeading tittel={tittel} />;
  }

  const erSorterbar = sortering.sorterbare.includes(kolonne);
  if (!erSorterbar) {
    return <KolonneHeading tittel={tittel} />;
  }

  return (
    <KolonneHeading
      tittel={tittel}
      sortering={{
        aktiv: sortering.kolonne === kolonne,
        retning: sortering.kolonne === kolonne ? sortering.retning : null,
        onSort: () => sortering.onSort(kolonne),
      }}
    />
  );
}

function hentHeaderCellProps(
  kolonne: SakslisteKolonne,
  sortering?: SakslisteSortering,
  kolonneHeaderProps?: SakslisteProps["kolonneHeaderProps"],
) {
  const ekstraProps = kolonneHeaderProps?.[kolonne];

  if (!sortering || !sortering.sorterbare.includes(kolonne)) {
    return ekstraProps;
  }

  const ariaSortVerdi: "ascending" | "descending" | "none" =
    sortering.kolonne === kolonne && sortering.retning
      ? sortering.retning === "stigende"
        ? "ascending"
        : "descending"
      : "none";

  return { ...ekstraProps, "aria-sort": ariaSortVerdi };
}
