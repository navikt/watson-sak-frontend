import {
  ChevronDownIcon,
  ChevronRightIcon,
  FilePdfIcon,
  FolderIcon,
  MenuElipsisVerticalIcon,
  TrashIcon,
} from "@navikt/aksel-icons";
import { ActionMenu, BodyShort, Button, Detail, Tag } from "@navikt/ds-react";
import { useState } from "react";
import { Link } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { RouteConfig } from "~/routeConfig";
import { formaterDato } from "~/utils/date-utils";
import { DokumentIkon } from "./dokument-ikon";
import { SlettDokumentModal } from "./dokument/SlettDokumentModal";
import { useDokumentSletting } from "./dokument/useDokumentSletting";
import { byggFilTre, type FilTreNode } from "./mapper/bygg-filtre";
import { erLikEllerUnder } from "./mapper/mappesti";
import type { DokumentNode } from "./typer";

function DokumentHandlinger({
  dokument,
  sakId,
  redigerbar,
  onSlett,
}: {
  dokument: DokumentNode;
  sakId: string;
  redigerbar: boolean;
  onSlett: (dokument: DokumentNode) => void;
}) {
  return (
    <ActionMenu>
      <ActionMenu.Trigger>
        <Button
          variant="tertiary"
          size="small"
          icon={<MenuElipsisVerticalIcon aria-hidden />}
          aria-label={`Handlinger for ${dokument.tittel || "Uten tittel"}`}
        />
      </ActionMenu.Trigger>
      <ActionMenu.Content>
        <ActionMenu.Item
          icon={<FilePdfIcon aria-hidden />}
          onSelect={() =>
            sporHendelse("dokument lastet ned", {
              sakId,
              docId: dokument.id,
              format: "pdf",
            })
          }
        >
          Last ned som PDF
        </ActionMenu.Item>
        {redigerbar && !dokument.arkivert && (
          <>
            <ActionMenu.Divider />
            <ActionMenu.Item
              variant="danger"
              icon={<TrashIcon aria-hidden />}
              onSelect={() => onSlett(dokument)}
            >
              Slett
            </ActionMenu.Item>
          </>
        )}
      </ActionMenu.Content>
    </ActionMenu>
  );
}

function DokumentRad({
  node,
  sakId,
  fremhevetId,
  redigerbar,
  kompakt,
  onSlett,
}: {
  node: DokumentNode;
  sakId: string;
  fremhevetId?: string;
  redigerbar: boolean;
  kompakt: boolean;
  onSlett: (dokument: DokumentNode) => void;
}) {
  const dokumentUrl = RouteConfig.SAKER_DOKUMENT.replace(":sakId", sakId).replace(
    ":docId",
    node.id,
  );
  const erFremhevet = fremhevetId === node.id;

  return (
    <li className="flex items-center gap-2">
      <Link
        to={dokumentUrl}
        aria-current={erFremhevet ? "page" : undefined}
        className={`flex min-w-0 flex-1 rounded-md px-2 py-1.5 no-underline transition-colors text-ax-text-default ${
          kompakt ? "flex-col items-start gap-0.5" : "items-center gap-2"
        } ${
          erFremhevet ? "bg-ax-bg-neutral-moderate-hover" : "hover:bg-ax-bg-neutral-moderate-hover"
        }`}
      >
        <span className="flex min-w-0 w-full items-center gap-2">
          <DokumentIkon aria-hidden className="shrink-0 text-ax-icon-info" />
          <BodyShort
            size="small"
            weight={erFremhevet ? "semibold" : "regular"}
            className="truncate flex-1"
          >
            {node.tittel || "Uten tittel"}
          </BodyShort>
          {node.arkivert && (
            <Tag variant="neutral" size="xsmall" className="shrink-0">
              Arkivert
            </Tag>
          )}
        </span>
        <Detail
          className={`truncate text-ax-text-neutral-subtle ${
            kompakt ? "max-w-full pl-6" : "shrink-0 whitespace-nowrap"
          }`}
        >
          {formaterDato(node.endretDato)} – {node.endretAv}
        </Detail>
      </Link>
      <div className="shrink-0">
        <DokumentHandlinger
          dokument={node}
          sakId={sakId}
          redigerbar={redigerbar}
          onSlett={onSlett}
        />
      </div>
    </li>
  );
}

type RadFelles = {
  sakId: string;
  fremhevetId?: string;
  redigerbar: boolean;
  kompakt: boolean;
  onSlett: (dokument: DokumentNode) => void;
};

function MappeGren({
  node,
  startÅpen,
  felles,
}: {
  node: Extract<FilTreNode, { type: "mappe" }>;
  startÅpen: (sti: string) => boolean;
  felles: RadFelles;
}) {
  const [åpen, settÅpen] = useState(() => startÅpen(node.sti));
  const Chevron = åpen ? ChevronDownIcon : ChevronRightIcon;

  return (
    <li>
      <button
        type="button"
        aria-expanded={åpen}
        onClick={() => settÅpen((forrige) => !forrige)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-ax-text-default hover:bg-ax-bg-neutral-moderate-hover"
      >
        <Chevron aria-hidden className="shrink-0 text-ax-icon-neutral" />
        <FolderIcon aria-hidden className="shrink-0 text-ax-icon-neutral" />
        <BodyShort size="small" className="truncate flex-1">
          {node.navn}
        </BodyShort>
        <Detail className="shrink-0 text-ax-text-neutral-subtle">{node.antallFiler}</Detail>
      </button>
      {åpen && (
        <ul className="ml-4 flex flex-col border-l border-ax-border-neutral-subtle pl-2">
          <TreNoder noder={node.barn} startÅpen={startÅpen} felles={felles} />
        </ul>
      )}
    </li>
  );
}

function TreNoder({
  noder,
  startÅpen,
  felles,
}: {
  noder: FilTreNode[];
  startÅpen: (sti: string) => boolean;
  felles: RadFelles;
}) {
  return noder.map((node) => {
    if (node.type === "mappe") {
      return (
        <MappeGren key={`mappe-${node.sti}`} node={node} startÅpen={startÅpen} felles={felles} />
      );
    }
    if (node.type === "dokument") {
      return <DokumentRad key={node.dokument.id} node={node.dokument} {...felles} />;
    }
    return null;
  });
}

/**
 * Dokumentlisten i sidepanelet på dokumentsiden. Når `mapper` er satt, vises dokumentene i
 * mappestrukturen fra Filer-området. Mappen med dokumentet som er åpent, er utvidet fra start.
 * Arkiverte dokumenter ligger nederst på rotnivå.
 */
export function DokumentTre({
  noder,
  mapper = [],
  sakId,
  redigerbar = false,
  fremhevetId,
  kompakt = false,
  redirectVedSletting,
}: {
  noder: DokumentNode[];
  /** Mappestiene på saken. Dokumenter uten mappe, eller når listen er tom, vises på rotnivå. */
  mapper?: string[];
  sakId: string;
  redigerbar?: boolean;
  fremhevetId?: string;
  /** Stabler tittel og metadata under hverandre, for smale flater som sidepanelet. */
  kompakt?: boolean;
  redirectVedSletting?: (docId: string) => string | undefined;
}) {
  const sletting = useDokumentSletting({
    sakId,
    kilde: "dokumentliste",
    redirectTo: redirectVedSletting,
  });

  const tre = byggFilTre(mapper, noder, []);
  const arkiverte = noder.filter((node) => node.arkivert);
  const fremhevet = noder.find((node) => node.id === fremhevetId);
  // Arkiverte dokumenter vises utenfor mappene, så de skal ikke åpne sin gamle mappegren.
  const fremhevetMappe = fremhevet?.arkivert ? undefined : fremhevet?.mappe;
  const startÅpen = (sti: string) => !!fremhevetMappe && erLikEllerUnder(fremhevetMappe, sti);
  const felles: RadFelles = {
    sakId,
    fremhevetId,
    redigerbar,
    kompakt,
    onSlett: sletting.start,
  };

  return (
    <>
      <ul className="flex flex-col" aria-label="Dokumenter">
        <TreNoder noder={tre} startÅpen={startÅpen} felles={felles} />
        {arkiverte.map((node) => (
          <DokumentRad key={node.id} node={node} {...felles} />
        ))}
      </ul>

      <SlettDokumentModal
        kandidat={sletting.kandidat}
        sletter={sletting.sletter}
        onBekreft={sletting.bekreft}
        onAvbryt={sletting.avbryt}
      />
    </>
  );
}
