import {
  ChevronDownIcon,
  ChevronUpIcon,
  FolderFileIcon,
  FolderIcon,
  LinkIcon,
  MenuElipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
} from "@navikt/aksel-icons";
import {
  ActionMenu,
  Alert,
  BodyShort,
  Button,
  Detail,
  HStack,
  Link,
  Loader,
  Tooltip,
} from "@navikt/ds-react";
import { useEffect, useMemo, useState, type DragEvent } from "react";
import { Link as RouterLink } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { RouteConfig } from "~/routeConfig";
import { formaterDato as formaterDokumentdato } from "~/utils/date-utils";
import { formaterStorrelse } from "~/utils/number-utils";
import { SlettDokumentModal } from "../dokument/SlettDokumentModal";
import { useDokumentSletting } from "../dokument/useDokumentSletting";
import { DokumentIkon } from "../dokument-ikon";
import { DokumentPdfKnapp, OmdøpFilKnapp, SlettFilKnapp } from "../element-handlinger";
import { filTypeIkon, filTypeTekst } from "../fil-type-utils";
import { formaterDato, ÅpneFilKnapp } from "../fil-visning-utils";
import { FilerRad } from "../FilerRad";
import type { DokumentNode, FilResponse } from "../typer";
import { byggFilTre, flatMappeliste, type FilTreNode, type MappeTreNode } from "./bygg-filtre";
import { FlyttTilMappeModal, GiNyttNavnMappeModal, type FlyttbartElement } from "./MappeModaler";
import { kanFlytteMappe, mappenavn, slåSammen } from "./mappesti";
import { useMappehandling } from "./useMappehandling";

/** Hvor noe slippes: en mappesti, eller `null` for rotnivå. */
type Slippmål = string | null;

type ÅpenModal =
  | { type: "gi-nytt-navn"; sti: string }
  | { type: "flytt"; element: FlyttbartElement }
  | null;

const AUTOÅPNE_ETTER_MS = 700;

function antallFilerTekst(antall: number) {
  return antall === 1 ? "1 fil" : `${antall} filer`;
}

interface FilTreProps {
  /** Alle mappestier på saken, også tomme mapper. */
  mapper: string[];
  /** Arkiverte elementer filtreres bort, de vises bare under Arkivert. */
  dokumenter: DokumentNode[];
  filer: FilResponse[];
  sakId: string;
  /** Om brukeren kan slette dokumenter. */
  redigerbar: boolean;
  /** Om brukeren kan endre mapper og flytte dokumenter og filer. Følger retten til å laste opp filer. */
  kanEndreMapper: boolean;
  /** Om innlogget bruker er sakseier og kan gi nytt navn til og slette vedlegg. */
  erSakseier: boolean;
  /** Om en opplasting pågår (styrt av `SakFilområde`, som eier «Last opp fil»-knappen). */
  lasterOpp?: boolean;
  /** Feilmelding fra en mislykket opplasting (styrt av `SakFilområde`). */
  feilFraServer?: string | null;
}

/**
 * Viser dokumenter og opplastede filer i en mappestruktur. Mappene er lukket når siden lastes.
 * Brukere som kan endre mapper, kan flytte mapper, dokumenter og filer med dra og slipp, eller med
 * «Flytt til …» fra menyen når de bruker tastatur.
 */
export function FilTre({
  mapper,
  dokumenter,
  filer,
  sakId,
  redigerbar,
  kanEndreMapper,
  erSakseier,
  lasterOpp = false,
  feilFraServer = null,
}: FilTreProps) {
  const tre = useMemo(() => byggFilTre(mapper, dokumenter, filer), [mapper, dokumenter, filer]);
  const alleMapper = useMemo(() => flatMappeliste(tre).map((mappe) => mappe.sti), [tre]);
  const [åpneMapper, settÅpneMapper] = useState<Set<string>>(() => new Set());
  const [dras, settDras] = useState<FlyttbartElement | null>(null);
  const [slippmål, settSlippmål] = useState<Slippmål | undefined>(undefined);
  const [modal, settModal] = useState<ÅpenModal>(null);
  const mappehandling = useMappehandling(sakId);
  const sletting = useDokumentSletting({ sakId, kilde: "dokumentliste" });

  function settÅpen(sti: string, åpen: boolean) {
    settÅpneMapper((forrige) => {
      if (forrige.has(sti) === åpen) return forrige;
      const neste = new Set(forrige);
      if (åpen) neste.add(sti);
      else neste.delete(sti);
      return neste;
    });
  }

  // Åpner en lukket mappe når brukeren holder et element over den en liten stund.
  useEffect(() => {
    if (typeof slippmål !== "string" || åpneMapper.has(slippmål)) return;
    const tidtaker = setTimeout(() => settÅpen(slippmål, true), AUTOÅPNE_ETTER_MS);
    return () => clearTimeout(tidtaker);
  }, [slippmål, åpneMapper]);

  function kanSlippe(element: FlyttbartElement | null, mål: Slippmål): boolean {
    if (!element) return false;
    if (element.type === "mappe") {
      return (
        kanFlytteMappe(element.sti, mål) &&
        !alleMapper.includes(slåSammen(mål, mappenavn(element.sti)))
      );
    }
    return element.mappe !== mål;
  }

  function flytt(element: FlyttbartElement, mål: Slippmål) {
    if (element.type === "mappe") {
      sporHendelse("mappe flyttet", { sakId, metode: "dra og slipp" });
      mappehandling.utfør({
        handling: "endre",
        fraSti: element.sti,
        tilSti: slåSammen(mål, mappenavn(element.sti)),
      });
    } else {
      sporHendelse(element.type === "dokument" ? "dokument flyttet" : "vedlegg flyttet", {
        sakId,
        metode: "dra og slipp",
      });
      mappehandling.utfør({
        handling: element.type === "dokument" ? "flytt-dokument" : "flytt-fil",
        id: element.id,
        mappe: mål,
      });
    }
    if (mål) settÅpen(mål, true);
  }

  function avsluttDra() {
    settDras(null);
    settSlippmål(undefined);
  }

  /** Props som gjør et element i treet flyttbart, og til et slippmål for mappen det ligger i. */
  function draProps(element: FlyttbartElement, mål: Slippmål) {
    if (!kanEndreMapper) return {};
    return {
      draggable: true,
      onDragStart: (event: DragEvent<HTMLElement>) => {
        event.stopPropagation();
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData(
          "text/plain",
          element.type === "mappe" ? mappenavn(element.sti) : element.navn,
        );
        settDras(element);
      },
      onDragEnd: avsluttDra,
      ...slippProps(mål),
    };
  }

  function slippProps(mål: Slippmål) {
    if (!kanEndreMapper) return {};
    return {
      onDragOver: (event: DragEvent<HTMLElement>) => {
        if (!dras) return;
        event.stopPropagation();
        if (!kanSlippe(dras, mål)) {
          event.dataTransfer.dropEffect = "none";
          settSlippmål(undefined);
          return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        settSlippmål(mål);
      },
      onDrop: (event: DragEvent<HTMLElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (dras && kanSlippe(dras, mål)) flytt(dras, mål);
        avsluttDra();
      },
    };
  }

  function renderNoder(noder: FilTreNode[], mappe: Slippmål) {
    return noder.map((node) => {
      if (node.type === "mappe") {
        return renderMappe(node);
      }
      if (node.type === "dokument") {
        return renderDokument(node.dokument, mappe);
      }
      return renderFil(node.fil, mappe);
    });
  }

  function renderMappe(mappe: MappeTreNode) {
    const åpen = åpneMapper.has(mappe.sti);
    const erSlippmål = slippmål === mappe.sti;
    const erTom = mappe.barn.length === 0;
    const innholdId = `mappe-innhold-${mappe.sti}`;

    return (
      <li
        key={`mappe:${mappe.sti}`}
        className={`rounded-sm border-b border-ax-border-neutral-subtle last:border-b-0 ${
          erSlippmål ? "bg-ax-bg-accent-soft outline-2 outline-ax-border-accent" : ""
        }`}
        {...draProps({ type: "mappe", sti: mappe.sti }, mappe.sti)}
      >
        <HStack align="center" gap="space-4" wrap={false}>
          <button
            type="button"
            aria-expanded={åpen}
            aria-controls={åpen ? innholdId : undefined}
            onClick={() => settÅpen(mappe.sti, !åpen)}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-sm py-[10px] text-left hover:bg-ax-bg-neutral-moderate-hover focus-visible:outline-2 focus-visible:outline-ax-border-focus"
          >
            <FolderIcon aria-hidden className="size-5 shrink-0 text-ax-icon-neutral" />
            <BodyShort as="span" size="small" weight="semibold" className="truncate">
              {mappe.navn}
            </BodyShort>
            <Detail as="span" className="shrink-0 text-ax-text-neutral-subtle">
              {antallFilerTekst(mappe.antallFiler)}
            </Detail>
            <span className="ml-auto shrink-0 pr-1" aria-hidden>
              {åpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </span>
          </button>
          {kanEndreMapper && (
            <ActionMenu>
              <ActionMenu.Trigger>
                <Button
                  type="button"
                  variant="tertiary-neutral"
                  size="xsmall"
                  icon={<MenuElipsisVerticalIcon aria-hidden />}
                  aria-label={`Handlinger for mappen ${mappe.navn}`}
                />
              </ActionMenu.Trigger>
              <ActionMenu.Content>
                <ActionMenu.Item
                  icon={<PencilIcon />}
                  onSelect={() => settModal({ type: "gi-nytt-navn", sti: mappe.sti })}
                >
                  Gi nytt navn
                </ActionMenu.Item>
                <ActionMenu.Item
                  icon={<FolderFileIcon />}
                  onSelect={() =>
                    settModal({ type: "flytt", element: { type: "mappe", sti: mappe.sti } })
                  }
                >
                  Flytt til …
                </ActionMenu.Item>
                <ActionMenu.Divider />
                <ActionMenu.Item
                  variant="danger"
                  icon={<TrashIcon />}
                  disabled={!erTom}
                  onSelect={() => {
                    sporHendelse("mappe slettet", { sakId });
                    mappehandling.utfør({ handling: "slett", sti: mappe.sti });
                  }}
                >
                  {erTom ? "Slett mappe" : "Slett mappe (må være tom)"}
                </ActionMenu.Item>
              </ActionMenu.Content>
            </ActionMenu>
          )}
        </HStack>
        {åpen && (
          <ul
            id={innholdId}
            aria-label={mappe.navn}
            className="mb-2 ml-[9px] flex flex-col border-l border-ax-border-neutral-subtle pl-4"
          >
            {erTom ? (
              <li>
                <Detail className="py-2 text-ax-text-neutral-subtle">Mappen er tom</Detail>
              </li>
            ) : (
              renderNoder(mappe.barn, mappe.sti)
            )}
          </ul>
        )}
      </li>
    );
  }

  function flyttKnapp(element: FlyttbartElement & { type: "dokument" | "fil" }) {
    if (!kanEndreMapper) return null;
    return (
      <Button
        type="button"
        variant="tertiary-neutral"
        size="xsmall"
        icon={<FolderFileIcon aria-hidden />}
        aria-label={`Flytt ${element.navn} til mappe`}
        onClick={() => settModal({ type: "flytt", element })}
      />
    );
  }

  function renderDokument(dokument: DokumentNode, mappe: Slippmål) {
    const tittel = dokument.tittel || "Uten tittel";
    const element = { type: "dokument", id: dokument.id, navn: tittel, mappe } as const;
    const dokumentUrl = RouteConfig.SAKER_DOKUMENT.replace(":sakId", sakId).replace(
      ":docId",
      dokument.id,
    );
    return (
      <FilerRad
        key={`dokument:${dokument.id}`}
        type="dokument"
        ikon={DokumentIkon}
        tittel={
          <Link as={RouterLink} to={dokumentUrl}>
            {tittel}
          </Link>
        }
        metadata={`Redigerbart · Opprettet i Watson Sak · Sist endret ${formaterDokumentdato(dokument.endretDato)}`}
        liProps={draProps(element, mappe)}
        handlinger={
          <HStack gap="space-1" align="center" wrap={false}>
            <DokumentPdfKnapp dokument={dokument} sakId={sakId} />
            {flyttKnapp(element)}
            {redigerbar && (
              <Button
                type="button"
                variant="tertiary-neutral"
                size="xsmall"
                icon={<TrashIcon aria-hidden />}
                aria-label={`Slett ${tittel}`}
                onClick={() => sletting.start(dokument)}
              />
            )}
          </HStack>
        }
      />
    );
  }

  function renderFil(fil: FilResponse, mappe: Slippmål) {
    const element = { type: "fil", id: fil.id, navn: fil.filnavn, mappe } as const;
    return (
      <FilerRad
        key={`fil:${fil.id}`}
        type="fil"
        ikon={filTypeIkon(fil.contentType)}
        tittel={fil.filnavn}
        tag={
          fil.bruktIDokumenter.length > 0 && (
            <Tooltip
              content={`I bruk i: ${fil.bruktIDokumenter.map((d) => d.tittel || "Uten tittel").join(", ")}`}
            >
              <LinkIcon
                aria-label={`Filen er i bruk i ${fil.bruktIDokumenter.length} dokument(er)`}
                className="text-ax-text-neutral-subtle"
              />
            </Tooltip>
          )
        }
        metadata={`Opplastet · ${filTypeTekst(fil.contentType)} · ${formaterStorrelse(fil.storrelse)} · Lastet opp ${formaterDato(fil.opprettet)}`}
        liProps={draProps(element, mappe)}
        handlinger={
          <HStack gap="space-1" align="center" wrap={false}>
            <ÅpneFilKnapp filId={fil.id} filnavn={fil.filnavn} sakId={sakId} />
            {flyttKnapp(element)}
            {erSakseier && (
              <>
                <OmdøpFilKnapp filId={fil.id} filnavn={fil.filnavn} sakId={sakId} />
                <SlettFilKnapp
                  filId={fil.id}
                  filnavn={fil.filnavn}
                  sakId={sakId}
                  bruktIDokumenter={fil.bruktIDokumenter}
                />
              </>
            )}
          </HStack>
        }
      />
    );
  }

  const feilmelding = feilFraServer ?? mappehandling.feil;
  const rotErSlippmål = slippmål === null;

  return (
    <div>
      {feilmelding && (
        <Alert variant="error" size="small" className="mb-2">
          {feilmelding}
        </Alert>
      )}

      {tre.length === 0 && !lasterOpp ? (
        <BodyShort size="small" className="py-2 text-ax-text-neutral-subtle">
          Ingen dokumenter eller filer ennå
        </BodyShort>
      ) : (
        <ul
          aria-label="Dokumenter og filer"
          className={`flex flex-col rounded-sm ${
            rotErSlippmål ? "outline-2 outline-offset-2 outline-ax-border-accent" : ""
          }`}
          {...slippProps(null)}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              settSlippmål(undefined);
            }
          }}
        >
          {renderNoder(tre, null)}
          {dras && kanSlippe(dras, null) && (
            <li
              className={`mt-2 rounded-sm border border-dashed px-3 py-2 ${
                rotErSlippmål
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
      )}

      {lasterOpp && (
        <div className="flex items-center gap-2 pt-2 text-ax-text-neutral-subtle">
          <Loader size="xsmall" aria-hidden />
          <span>Laster opp …</span>
        </div>
      )}

      {modal?.type === "gi-nytt-navn" && (
        <GiNyttNavnMappeModal
          sakId={sakId}
          sti={modal.sti}
          mapper={alleMapper}
          onClose={() => settModal(null)}
        />
      )}
      {modal?.type === "flytt" && (
        <FlyttTilMappeModal
          sakId={sakId}
          element={modal.element}
          mapper={alleMapper}
          onClose={() => settModal(null)}
        />
      )}
      <SlettDokumentModal
        kandidat={sletting.kandidat}
        sletter={sletting.sletter}
        onBekreft={sletting.bekreft}
        onAvbryt={sletting.avbryt}
      />
    </div>
  );
}
