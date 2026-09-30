import {
  ChevronDownIcon,
  ChevronUpIcon,
  FolderFileIcon,
  FolderIcon,
  LinkIcon,
  PencilIcon,
  TrashIcon,
} from "@navikt/aksel-icons";
import {
  ActionMenu,
  Alert,
  BodyShort,
  Detail,
  HStack,
  Link,
  Loader,
  Tooltip,
} from "@navikt/ds-react";
import { useEffect, useId, useMemo, useRef, useState, type DragEvent } from "react";
import { Link as RouterLink } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { RouteConfig } from "~/routeConfig";
import { formaterDato as formaterDokumentdato } from "~/utils/date-utils";
import { formaterStorrelse } from "~/utils/number-utils";
import { SlettDokumentModal } from "../dokument/SlettDokumentModal";
import { useDokumentSletting } from "../dokument/useDokumentSletting";
import { DokumentIkon } from "../dokument-ikon";
import { DokumentPdfKnapp, useFilSletting } from "../element-handlinger";
import { filTypeIkon, filTypeTekst } from "../fil-type-utils";
import { formaterDato, ÅpneFilKnapp } from "../fil-visning-utils";
import { FilerRad } from "../FilerRad";
import { OmdøpFilModal } from "../OmdøpFilModal";
import type { DokumentNode, FilResponse } from "../typer";
import { byggFilTre, flatMappeliste, type FilTreNode, type MappeTreNode } from "./bygg-filtre";
import { Elementmeny, kontekstmeny } from "./Elementmeny";
import { FlyttTilMappeModal, GiNyttNavnMappeModal, type FlyttbartElement } from "./MappeModaler";
import { forelder, kanFlytteMappe, mappenavn, slåSammen } from "./mappesti";
import { useMappehandling } from "./useMappehandling";

/** Hvor noe slippes: en mappesti, eller `null` for rotnivå. */
type Slippmål = string | null;

type ÅpenModal =
  | { type: "gi-nytt-navn"; sti: string }
  | { type: "flytt"; element: FlyttbartElement }
  | { type: "gi-nytt-navn-fil"; fil: FilResponse }
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
  const treRef = useRef<HTMLDivElement>(null);
  const [statusmelding, settStatusmelding] = useState("");
  const mappehandling = useMappehandling(sakId);
  const treId = useId();
  const sletting = useDokumentSletting({ sakId, kilde: "dokumentliste" });
  const filsletting = useFilSletting(sakId);
  /** Nøkkelen til elementet med åpen meny. Bare én meny kan være åpen om gangen. */
  const [åpenMeny, settÅpenMeny] = useState<string | null>(null);

  function menyProps(nøkkel: string) {
    return {
      åpen: åpenMeny === nøkkel,
      onOpenChange: (åpen: boolean) => settÅpenMeny(åpen ? nøkkel : null),
    };
  }

  /**
   * Raden med den fokuserte menyknappen forsvinner når mappen slettes. Fokus flyttes til
   * overordnet mappe, eller til listen hvis mappen lå på rotnivå.
   */
  function flyttFokusEtterSletting(forelderSti: string | null) {
    const tre = treRef.current;
    if (!tre) return;
    const forelderKnapp = [...tre.querySelectorAll<HTMLElement>("[data-mappe-sti]")].find(
      (knapp) => knapp.dataset.mappeSti === forelderSti,
    );
    (forelderKnapp ?? tre.querySelector<HTMLElement>("[data-tre-rot]") ?? tre).focus();
  }

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
      // Én mappehandling om gangen, så flyttinger ikke kan fullføres i feil rekkefølge.
      draggable: !mappehandling.pågår,
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
    // Stien kan inneholde mellomrom, som ikke er lov i en id som `aria-controls` peker på.
    const innholdId = `${treId}-mappe-${encodeURIComponent(mappe.sti)}`;
    const menynøkkel = `mappe:${mappe.sti}`;

    return (
      <li
        key={`mappe:${mappe.sti}`}
        className={`rounded-sm border-b border-ax-border-neutral-subtle last:border-b-0 ${
          erSlippmål ? "bg-ax-bg-accent-soft outline-2 outline-ax-border-accent" : ""
        }`}
        {...draProps({ type: "mappe", sti: mappe.sti }, mappe.sti)}
      >
        <HStack
          align="center"
          gap="space-4"
          wrap={false}
          className="group/rad"
          onContextMenu={kanEndreMapper ? kontekstmeny(() => settÅpenMeny(menynøkkel)) : undefined}
        >
          <button
            type="button"
            aria-expanded={åpen}
            data-mappe-sti={mappe.sti}
            aria-controls={åpen ? innholdId : undefined}
            onClick={() => settÅpen(mappe.sti, !åpen)}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-sm py-[10px] text-left hover:bg-ax-bg-neutral-moderate-hover focus-visible:outline-2 focus-visible:outline-ax-border-focus"
          >
            <FolderIcon aria-hidden className="size-5 shrink-0 text-ax-icon-neutral" />
            <BodyShort as="span" weight="semibold" className="truncate">
              {mappe.navn}
            </BodyShort>
            <BodyShort
              as="span"
              size="small"
              className="ml-auto shrink-0 pl-4 text-ax-text-neutral-subtle"
            >
              {antallFilerTekst(mappe.antallFiler)}
            </BodyShort>
            <span className="shrink-0 pr-1" aria-hidden>
              {åpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
            </span>
          </button>
          {kanEndreMapper && (
            <Elementmeny label={`Handlinger for mappen ${mappe.navn}`} {...menyProps(menynøkkel)}>
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
                  const slettet = mappehandling.utfør({ handling: "slett", sti: mappe.sti }, () => {
                    settStatusmelding(`Mappen «${mappenavn(mappe.sti)}» er slettet`);
                    flyttFokusEtterSletting(forelder(mappe.sti));
                  });
                  if (slettet) {
                    sporHendelse("mappe slettet", { sakId });
                  }
                }}
              >
                {erTom ? "Slett mappe" : "Slett mappe (må være tom)"}
              </ActionMenu.Item>
            </Elementmeny>
          )}
        </HStack>
        {åpen && (
          <ul
            id={innholdId}
            aria-label={mappe.navn}
            className="mb-2 ml-[9px] flex flex-col border-l-2 border-ax-border-neutral-subtle pl-3"
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

  function flyttValg(element: FlyttbartElement) {
    if (!kanEndreMapper) return null;
    return (
      <ActionMenu.Item
        icon={<FolderFileIcon />}
        onSelect={() => settModal({ type: "flytt", element })}
      >
        Flytt til …
      </ActionMenu.Item>
    );
  }

  /** Radattributter for dra og slipp, og høyreklikk når raden har en meny. */
  function radProps(element: FlyttbartElement, mappe: Slippmål, harMeny: boolean) {
    const nøkkel = `${element.type}:${element.type === "mappe" ? element.sti : element.id}`;
    return {
      ...draProps(element, mappe),
      onContextMenu: harMeny ? kontekstmeny(() => settÅpenMeny(nøkkel)) : undefined,
    };
  }

  function renderDokument(dokument: DokumentNode, mappe: Slippmål) {
    const tittel = dokument.tittel || "Uten tittel";
    const element = { type: "dokument", id: dokument.id, navn: tittel, mappe } as const;
    const dokumentUrl = RouteConfig.SAKER_DOKUMENT.replace(":sakId", sakId).replace(
      ":docId",
      dokument.id,
    );
    const harMeny = kanEndreMapper || redigerbar;
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
        liProps={radProps(element, mappe, harMeny)}
        handlinger={
          <HStack gap="space-1" align="center" wrap={false}>
            <DokumentPdfKnapp dokument={dokument} sakId={sakId} />
            {harMeny && (
              <Elementmeny
                label={`Handlinger for ${tittel}`}
                {...menyProps(`dokument:${dokument.id}`)}
              >
                {flyttValg(element)}
                {redigerbar && (
                  <ActionMenu.Item
                    variant="danger"
                    icon={<TrashIcon />}
                    onSelect={() => sletting.start(dokument)}
                  >
                    Slett
                  </ActionMenu.Item>
                )}
              </Elementmeny>
            )}
          </HStack>
        }
      />
    );
  }

  function renderFil(fil: FilResponse, mappe: Slippmål) {
    const element = { type: "fil", id: fil.id, navn: fil.filnavn, mappe } as const;
    const harMeny = kanEndreMapper || erSakseier;
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
        liProps={radProps(element, mappe, harMeny)}
        handlinger={
          <HStack gap="space-1" align="center" wrap={false}>
            <ÅpneFilKnapp filId={fil.id} filnavn={fil.filnavn} sakId={sakId} />
            {harMeny && (
              <Elementmeny label={`Handlinger for ${fil.filnavn}`} {...menyProps(`fil:${fil.id}`)}>
                {flyttValg(element)}
                {erSakseier && (
                  <>
                    <ActionMenu.Item
                      icon={<PencilIcon />}
                      onSelect={() => settModal({ type: "gi-nytt-navn-fil", fil })}
                    >
                      Gi nytt navn
                    </ActionMenu.Item>
                    <ActionMenu.Divider />
                    <ActionMenu.Item
                      variant="danger"
                      icon={<TrashIcon />}
                      onSelect={() => filsletting.start(fil)}
                    >
                      Slett
                    </ActionMenu.Item>
                  </>
                )}
              </Elementmeny>
            )}
          </HStack>
        }
      />
    );
  }

  const rotErSlippmål = slippmål === null;

  return (
    <div ref={treRef} tabIndex={-1} className="outline-none">
      <div aria-live="polite" className="sr-only">
        {statusmelding}
      </div>
      {/* Feil fra opplasting og fra mappehandlinger vises hver for seg, så en gammel
          opplastingsfeil ikke skjuler feilen fra handlingen som nettopp feilet. */}
      {feilFraServer && (
        <Alert variant="error" size="small" className="mb-2">
          {feilFraServer}
        </Alert>
      )}
      {mappehandling.feil && (
        <Alert variant="error" size="small" className="mb-2">
          {mappehandling.feil}
        </Alert>
      )}

      {tre.length === 0 && !lasterOpp ? (
        <BodyShort size="small" className="py-2 text-ax-text-neutral-subtle">
          Ingen dokumenter eller filer ennå
        </BodyShort>
      ) : (
        <ul
          aria-label="Dokumenter og filer"
          data-tre-rot
          tabIndex={-1}
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
      {modal?.type === "gi-nytt-navn-fil" && (
        <OmdøpFilModal
          åpen
          filId={modal.fil.id}
          filnavn={modal.fil.filnavn}
          sakId={sakId}
          onClose={() => settModal(null)}
        />
      )}
      {filsletting.modaler}
      <SlettDokumentModal
        kandidat={sletting.kandidat}
        sletter={sletting.sletter}
        onBekreft={sletting.bekreft}
        onAvbryt={sletting.avbryt}
      />
    </div>
  );
}
