import {
  ChevronDownIcon,
  ChevronRightIcon,
  FilePdfIcon,
  MenuElipsisVerticalIcon,
  TrashIcon,
} from "@navikt/aksel-icons";
import { ActionMenu, BodyLong, BodyShort, Button, Detail, HStack, Modal } from "@navikt/ds-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { formaterDato } from "~/utils/date-utils";
import { DokumentIkon } from "./dokument-ikon";
import type { DokumentNode } from "./typer";

type Dokumentrad = Extract<DokumentNode, { type: "dokument" }>;

/** Returnerer alle synlige node-IDer i trekkordion-rekkefølge */
function hentSynligeNodeIder(noder: DokumentNode[], åpneMapper: Set<string>): string[] {
  const ider: string[] = [];
  for (const node of noder) {
    ider.push(node.id);
    if (node.type === "mappe" && åpneMapper.has(node.id)) {
      ider.push(...hentSynligeNodeIder(node.barn, åpneMapper));
    }
  }
  return ider;
}

/** Finner en node i treet basert på ID */
function finnNode(id: string, noder: DokumentNode[]): DokumentNode | undefined {
  for (const node of noder) {
    if (node.id === id) return node;
    if (node.type === "mappe") {
      const funnet = finnNode(id, node.barn);
      if (funnet) return funnet;
    }
  }
  return undefined;
}

/** Finner foreldernoden til en gitt node */
function finnForelder(nodeId: string, noder: DokumentNode[]): DokumentNode | undefined {
  for (const node of noder) {
    if (node.type === "mappe") {
      if (node.barn.some((b) => b.id === nodeId)) return node;
      const funnet = finnForelder(nodeId, node.barn);
      if (funnet) return funnet;
    }
  }
  return undefined;
}

function DokumentHandlinger({
  dokument,
  redigerbar,
  onSlett,
}: {
  dokument: Dokumentrad;
  redigerbar: boolean;
  onSlett: (dokument: Dokumentrad) => void;
}) {
  return (
    <ActionMenu>
      <ActionMenu.Trigger>
        <Button
          variant="tertiary"
          size="small"
          icon={<MenuElipsisVerticalIcon aria-hidden />}
          aria-label={`Handlinger for ${dokument.tittel}`}
        />
      </ActionMenu.Trigger>
      <ActionMenu.Content>
        {/* «Last ned som PDF» er foreløpig en no-op – støtte kommer senere. */}
        <ActionMenu.Item icon={<FilePdfIcon aria-hidden />} onSelect={() => {}}>
          Last ned som PDF
        </ActionMenu.Item>
        {redigerbar && (
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
  nivå,
  sakId,
  fokusertId,
  åpneMapper,
  redigerbar,
  onToggle,
  onSlett,
}: {
  node: DokumentNode;
  nivå: number;
  sakId: string;
  fokusertId: string | null;
  åpneMapper: Set<string>;
  redigerbar: boolean;
  onToggle: (id: string) => void;
  onSlett: (dokument: Dokumentrad) => void;
}) {
  const erFokusert = fokusertId === node.id;

  if (node.type === "mappe") {
    const åpen = åpneMapper.has(node.id);
    return (
      <li role="none">
        <button
          role="treeitem"
          type="button"
          onClick={() => onToggle(node.id)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-ax-bg-neutral-moderate-hover transition-colors cursor-pointer"
          style={{ paddingLeft: `${(nivå - 1) * 1.5 + 0.5}rem` }}
          aria-expanded={åpen}
          aria-level={nivå}
          tabIndex={erFokusert ? 0 : -1}
          data-tree-id={node.id}
        >
          {åpen ? (
            <ChevronDownIcon aria-hidden className="shrink-0" />
          ) : (
            <ChevronRightIcon aria-hidden className="shrink-0" />
          )}
          <DokumentIkon node={node} aria-hidden className="shrink-0 text-ax-icon-info" />
          <BodyShort weight="semibold" size="small" className="truncate">
            {node.navn}
          </BodyShort>
        </button>
        {åpen && (
          <ul role="group">
            {node.barn.map((barn) => (
              <DokumentRad
                key={barn.id}
                node={barn}
                nivå={nivå + 1}
                sakId={sakId}
                fokusertId={fokusertId}
                åpneMapper={åpneMapper}
                redigerbar={redigerbar}
                onToggle={onToggle}
                onSlett={onSlett}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  const dokumentUrl = RouteConfig.SAKER_DOKUMENT.replace(":sakId", sakId).replace(
    ":docId",
    node.id,
  );

  return (
    <li role="none" className="flex items-center gap-1">
      <Link
        role="treeitem"
        to={dokumentUrl}
        className="flex flex-1 min-w-0 items-center gap-2 rounded-md px-2 py-1.5 no-underline hover:bg-ax-bg-neutral-moderate-hover transition-colors text-ax-text-default"
        style={{ paddingLeft: `${(nivå - 1) * 1.5 + 0.5}rem` }}
        aria-level={nivå}
        tabIndex={erFokusert ? 0 : -1}
        data-tree-id={node.id}
      >
        <DokumentIkon node={node} aria-hidden className="shrink-0 text-ax-icon-info" />
        <BodyShort size="small" className="truncate flex-1">
          {node.tittel}
        </BodyShort>
        <HStack gap="space-8" align="center" className="shrink-0">
          <Detail className="text-ax-text-neutral-subtle whitespace-nowrap">
            {formaterDato(node.endretDato)} – {node.endretAv}
          </Detail>
        </HStack>
      </Link>
      <div className="shrink-0">
        <DokumentHandlinger dokument={node} redigerbar={redigerbar} onSlett={onSlett} />
      </div>
    </li>
  );
}

export function DokumentTre({
  noder,
  sakId,
  redigerbar = false,
}: {
  noder: DokumentNode[];
  sakId: string;
  redigerbar?: boolean;
}) {
  const [åpneMapper, setÅpneMapper] = useState<Set<string>>(new Set());
  const [fokusertId, setFokusertId] = useState<string | null>(noder[0]?.id ?? null);
  const [sletteKandidat, setSletteKandidat] = useState<Dokumentrad | null>(null);
  const treRef = useRef<HTMLUListElement>(null);
  const slettFetcher = useFetcher();
  const sletter = slettFetcher.state !== "idle";

  const bekreftSletting = useCallback(() => {
    if (!sletteKandidat) {
      return;
    }
    slettFetcher.submit(
      { docId: sletteKandidat.id },
      { method: "delete", action: RouteConfig.API.SAK_DOKUMENTER.replace(":sakId", sakId) },
    );
    setSletteKandidat(null);
  }, [sletteKandidat, slettFetcher, sakId]);

  const toggleMappe = useCallback((id: string) => {
    setÅpneMapper((prev) => {
      const neste = new Set(prev);
      if (neste.has(id)) {
        neste.delete(id);
      } else {
        neste.add(id);
      }
      return neste;
    });
  }, []);

  useEffect(() => {
    if (fokusertId && treRef.current) {
      const el = treRef.current.querySelector(`[data-tree-id="${fokusertId}"]`);
      if (el instanceof HTMLElement) {
        el.focus();
      }
    }
  }, [fokusertId]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const synligeIder = hentSynligeNodeIder(noder, åpneMapper);
      const gjeldende = fokusertId ? synligeIder.indexOf(fokusertId) : -1;

      switch (event.key) {
        case " ":
        case "Enter": {
          if (fokusertId) {
            const node = finnNode(fokusertId, noder);
            if (node?.type === "mappe") {
              event.preventDefault();
              toggleMappe(node.id);
            }
          }
          break;
        }
        case "ArrowDown": {
          event.preventDefault();
          if (gjeldende < synligeIder.length - 1) {
            setFokusertId(synligeIder[gjeldende + 1]);
          }
          break;
        }
        case "ArrowUp": {
          event.preventDefault();
          if (gjeldende > 0) {
            setFokusertId(synligeIder[gjeldende - 1]);
          }
          break;
        }
        case "ArrowRight": {
          event.preventDefault();
          if (fokusertId) {
            const node = finnNode(fokusertId, noder);
            if (node?.type === "mappe") {
              if (!åpneMapper.has(node.id)) {
                toggleMappe(node.id);
              } else if (node.barn.length > 0) {
                setFokusertId(node.barn[0].id);
              }
            }
          }
          break;
        }
        case "ArrowLeft": {
          event.preventDefault();
          if (fokusertId) {
            const node = finnNode(fokusertId, noder);
            if (node?.type === "mappe" && åpneMapper.has(node.id)) {
              toggleMappe(node.id);
            } else {
              const forelder = finnForelder(fokusertId, noder);
              if (forelder) {
                setFokusertId(forelder.id);
              }
            }
          }
          break;
        }
        case "Home": {
          event.preventDefault();
          if (synligeIder.length > 0) {
            setFokusertId(synligeIder[0]);
          }
          break;
        }
        case "End": {
          event.preventDefault();
          if (synligeIder.length > 0) {
            setFokusertId(synligeIder[synligeIder.length - 1]);
          }
          break;
        }
      }
    },
    [fokusertId, noder, åpneMapper, toggleMappe],
  );

  return (
    <>
      <ul
        className="flex flex-col"
        role="tree"
        aria-label="Dokumenter"
        ref={treRef}
        onKeyDown={handleKeyDown}
      >
        {noder.map((node) => (
          <DokumentRad
            key={node.id}
            node={node}
            nivå={1}
            sakId={sakId}
            fokusertId={fokusertId}
            åpneMapper={åpneMapper}
            redigerbar={redigerbar}
            onToggle={toggleMappe}
            onSlett={setSletteKandidat}
          />
        ))}
      </ul>

      <Modal
        open={sletteKandidat !== null}
        onClose={() => setSletteKandidat(null)}
        header={{ heading: "Slette dokument?", icon: <TrashIcon aria-hidden /> }}
        width="small"
      >
        <Modal.Body>
          <BodyLong>
            Er du sikker på at du vil slette{" "}
            <strong>{sletteKandidat?.tittel || "Uten tittel"}</strong>? Dette kan ikke angres.
          </BodyLong>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={bekreftSletting} loading={sletter}>
            Slett dokument
          </Button>
          <Button variant="secondary" onClick={() => setSletteKandidat(null)} disabled={sletter}>
            Avbryt
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
