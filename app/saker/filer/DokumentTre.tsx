import {
  ChevronDownIcon,
  ChevronRightIcon,
  FilePdfIcon,
  FolderFileIcon,
  FolderIcon,
  MenuElipsisVerticalIcon,
  TrashIcon,
} from "@navikt/aksel-icons";
import { ActionMenu, Alert, BodyShort, Button, Detail, Tag } from "@navikt/ds-react";
import { useCallback, useState, type HTMLAttributes } from "react";
import { Link } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { RouteConfig } from "~/routeConfig";
import { formaterDato } from "~/utils/date-utils";
import { DokumentIkon } from "./dokument-ikon";
import { SlettDokumentModal } from "./dokument/SlettDokumentModal";
import { useDokumentSletting } from "./dokument/useDokumentSletting";
import { byggFilTre, flatMappeliste, type FilTreNode } from "./mapper/bygg-filtre";
import { FlyttTilMappeModal, type FlyttbartElement } from "./mapper/MappeModaler";
import { erLikEllerUnder } from "./mapper/mappesti";
import { useDraOgSlipp } from "./mapper/useDraOgSlipp";
import { useMappehandling } from "./mapper/useMappehandling";
import type { DokumentNode } from "./typer";

function DokumentHandlinger({
  dokument,
  sakId,
  redigerbar,
  kanEndreMapper,
  onSlett,
  onFlytt,
}: {
  dokument: DokumentNode;
  sakId: string;
  redigerbar: boolean;
  kanEndreMapper: boolean;
  onSlett: (dokument: DokumentNode) => void;
  onFlytt: (element: FlyttbartElement) => void;
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
        {kanEndreMapper && !dokument.arkivert && (
          <ActionMenu.Item
            icon={<FolderFileIcon aria-hidden />}
            onSelect={() =>
              onFlytt({
                type: "dokument",
                id: dokument.id,
                navn: dokument.tittel || "Uten tittel",
                mappe: dokument.mappe ?? null,
              })
            }
          >
            Flytt til …
          </ActionMenu.Item>
        )}
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
  kanEndreMapper,
  kompakt,
  onSlett,
  onFlytt,
  liProps,
}: {
  node: DokumentNode;
  sakId: string;
  fremhevetId?: string;
  redigerbar: boolean;
  kanEndreMapper: boolean;
  kompakt: boolean;
  onSlett: (dokument: DokumentNode) => void;
  onFlytt: (element: FlyttbartElement) => void;
  liProps?: HTMLAttributes<HTMLLIElement>;
}) {
  const dokumentUrl = RouteConfig.SAKER_DOKUMENT.replace(":sakId", sakId).replace(
    ":docId",
    node.id,
  );
  const erFremhevet = fremhevetId === node.id;

  return (
    <li className="flex items-center gap-2" {...liProps}>
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
          kanEndreMapper={kanEndreMapper}
          onSlett={onSlett}
          onFlytt={onFlytt}
        />
      </div>
    </li>
  );
}

type RadFelles = {
  sakId: string;
  fremhevetId?: string;
  redigerbar: boolean;
  kanEndreMapper: boolean;
  kompakt: boolean;
  onSlett: (dokument: DokumentNode) => void;
  onFlytt: (element: FlyttbartElement) => void;
};

function MappeGren({
  node,
  felles,
  åpneMapper,
  settÅpen,
  draProps,
  slippmål,
  kanEndreMapper,
  onFlytt,
}: {
  node: Extract<FilTreNode, { type: "mappe" }>;
  felles: RadFelles;
  åpneMapper: Set<string>;
  settÅpen: (sti: string, åpen: boolean) => void;
  draProps: ReturnType<typeof useDraOgSlipp>["draProps"];
  slippmål: string | null | undefined;
  kanEndreMapper: boolean;
  onFlytt: (element: FlyttbartElement) => void;
}) {
  const åpen = åpneMapper.has(node.sti);
  const Chevron = åpen ? ChevronDownIcon : ChevronRightIcon;
  const erSlippmål = slippmål === node.sti;

  return (
    <li
      className={
        erSlippmål ? "rounded-sm bg-ax-bg-accent-soft outline-2 outline-ax-border-accent" : ""
      }
      {...draProps({ type: "mappe", sti: node.sti }, node.sti)}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-expanded={åpen}
          onClick={() => settÅpen(node.sti, !åpen)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-ax-text-default hover:bg-ax-bg-neutral-moderate-hover"
        >
          <Chevron aria-hidden className="shrink-0 text-ax-icon-neutral" />
          <FolderIcon aria-hidden className="shrink-0 text-ax-icon-neutral" />
          <BodyShort size="small" className="truncate flex-1">
            {node.navn}
          </BodyShort>
          <Detail className="shrink-0 text-ax-text-neutral-subtle">{node.antallFiler}</Detail>
        </button>
        {kanEndreMapper && (
          <ActionMenu>
            <ActionMenu.Trigger>
              <Button
                variant="tertiary"
                size="small"
                icon={<MenuElipsisVerticalIcon aria-hidden />}
                aria-label={`Handlinger for mappen ${node.navn}`}
              />
            </ActionMenu.Trigger>
            <ActionMenu.Content>
              <ActionMenu.Item
                icon={<FolderFileIcon aria-hidden />}
                onSelect={() => onFlytt({ type: "mappe", sti: node.sti })}
              >
                Flytt til …
              </ActionMenu.Item>
            </ActionMenu.Content>
          </ActionMenu>
        )}
      </div>
      {åpen && (
        <ul className="ml-4 flex flex-col border-l border-ax-border-neutral-subtle pl-2">
          <TreNoder
            noder={node.barn}
            felles={felles}
            åpneMapper={åpneMapper}
            settÅpen={settÅpen}
            draProps={draProps}
            slippmål={slippmål}
          />
        </ul>
      )}
    </li>
  );
}

function TreNoder({
  noder,
  felles,
  åpneMapper,
  settÅpen,
  draProps,
  slippmål,
}: {
  noder: FilTreNode[];
  felles: RadFelles;
  åpneMapper: Set<string>;
  settÅpen: (sti: string, åpen: boolean) => void;
  draProps: ReturnType<typeof useDraOgSlipp>["draProps"];
  slippmål: string | null | undefined;
}) {
  return noder.map((node) => {
    if (node.type === "mappe") {
      return (
        <MappeGren
          key={`mappe-${node.sti}`}
          node={node}
          felles={felles}
          åpneMapper={åpneMapper}
          settÅpen={settÅpen}
          draProps={draProps}
          slippmål={slippmål}
          kanEndreMapper={felles.kanEndreMapper}
          onFlytt={felles.onFlytt}
        />
      );
    }
    if (node.type === "dokument") {
      const dokument = node.dokument;
      return (
        <DokumentRad
          key={dokument.id}
          node={dokument}
          {...felles}
          liProps={draProps(
            {
              type: "dokument",
              id: dokument.id,
              navn: dokument.tittel || "Uten tittel",
              mappe: dokument.mappe ?? null,
            },
            dokument.mappe ?? null,
          )}
        />
      );
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
  kanEndreMapper = false,
  redigerbar = false,
  fremhevetId,
  kompakt = false,
  redirectVedSletting,
}: {
  noder: DokumentNode[];
  /** Mappestiene på saken. Dokumenter uten mappe, eller når listen er tom, vises på rotnivå. */
  mapper?: string[];
  sakId: string;
  kanEndreMapper?: boolean;
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
  const alleMapper = flatMappeliste(tre).map((mappe) => mappe.sti);
  const arkiverte = noder.filter((node) => node.arkivert);
  const fremhevet = noder.find((node) => node.id === fremhevetId);
  // Arkiverte dokumenter vises utenfor mappene, så de skal ikke åpne sin gamle mappegren.
  const fremhevetMappe = fremhevet?.arkivert ? undefined : fremhevet?.mappe;
  const [åpneMapper, settÅpneMapper] = useState<Set<string>>(
    () =>
      new Set(alleMapper.filter((sti) => !!fremhevetMappe && erLikEllerUnder(fremhevetMappe, sti))),
  );
  const [flytteElement, settFlytteElement] = useState<FlyttbartElement | null>(null);
  const settÅpen = useCallback((sti: string, åpen: boolean) => {
    settÅpneMapper((forrige) => {
      if (forrige.has(sti) === åpen) return forrige;
      const neste = new Set(forrige);
      if (åpen) neste.add(sti);
      else neste.delete(sti);
      return neste;
    });
  }, []);
  const mappehandling = useMappehandling(sakId);
  const { dras, slippmål, draProps, slippProps, kanSlippe, fjernSlippmål } = useDraOgSlipp({
    sakId,
    alleMapper,
    kanEndreMapper,
    mappehandling,
    settÅpen,
  });
  const felles: RadFelles = {
    sakId,
    fremhevetId,
    redigerbar,
    kanEndreMapper,
    kompakt,
    onSlett: sletting.start,
    onFlytt: settFlytteElement,
  };

  return (
    <>
      {mappehandling.feil && (
        <Alert variant="error" size="small" className="mb-2">
          {mappehandling.feil}
        </Alert>
      )}
      <ul
        className={`flex flex-col rounded-sm ${slippmål === null ? "outline-2 outline-offset-2 outline-ax-border-accent" : ""}`}
        aria-label="Dokumenter"
        {...slippProps(null)}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) fjernSlippmål();
        }}
      >
        <TreNoder
          noder={tre}
          felles={felles}
          åpneMapper={åpneMapper}
          settÅpen={settÅpen}
          draProps={draProps}
          slippmål={slippmål}
        />
        {arkiverte.map((node) => (
          <DokumentRad key={node.id} node={node} {...felles} />
        ))}
        {dras && kanSlippe(dras, null) && (
          <li
            className={`mt-2 rounded-sm border border-dashed px-3 py-2 ${
              slippmål === null
                ? "border-ax-border-accent bg-ax-bg-accent-soft"
                : "border-ax-border-neutral-subtle"
            }`}
          >
            <Detail className="text-ax-text-neutral-subtle">
              Slipp her for å flytte til rotnivå
            </Detail>
          </li>
        )}
      </ul>

      <SlettDokumentModal
        kandidat={sletting.kandidat}
        sletter={sletting.sletter}
        onBekreft={sletting.bekreft}
        onAvbryt={sletting.avbryt}
      />
      {flytteElement && (
        <FlyttTilMappeModal
          sakId={sakId}
          element={flytteElement}
          mapper={alleMapper}
          onClose={() => settFlytteElement(null)}
        />
      )}
    </>
  );
}
