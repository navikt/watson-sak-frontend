import { ChevronDownIcon, ChevronRightIcon } from "@navikt/aksel-icons";
import { BodyShort, Detail, HStack, Tag } from "@navikt/ds-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formaterDato } from "~/utils/date-utils";
import { FilIkon } from "./fil-ikon";
import type { FilNode, FilType } from "./typer";

const formatNavn: Record<FilType, string> = {
  word: "Word",
  excel: "Excel",
  pdf: "PDF",
  powerpoint: "PowerPoint",
  bilde: "Bilde",
  csv: "CSV",
  json: "JSON",
  kode: "Kode",
  tekst: "Tekst",
  annet: "Fil",
};

/** Returnerer alle synlige node-IDer i trekkordion-rekkefølge */
function hentSynligeNodeIder(noder: FilNode[], åpneMapper: Set<string>): string[] {
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
function finnNode(id: string, noder: FilNode[]): FilNode | undefined {
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
function finnForelder(nodeId: string, noder: FilNode[]): FilNode | undefined {
  for (const node of noder) {
    if (node.type === "mappe") {
      if (node.barn.some((b) => b.id === nodeId)) return node;
      const funnet = finnForelder(nodeId, node.barn);
      if (funnet) return funnet;
    }
  }
  return undefined;
}

function FilRad({
  node,
  nivå,
  fokusertId,
  åpneMapper,
  onToggle,
}: {
  node: FilNode;
  nivå: number;
  fokusertId: string | null;
  åpneMapper: Set<string>;
  onToggle: (id: string) => void;
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
          <FilIkon node={node} aria-hidden className="shrink-0 text-ax-icon-info" />
          <BodyShort weight="semibold" size="small" className="truncate">
            {node.navn}
          </BodyShort>
        </button>
        {åpen && (
          <ul role="group">
            {node.barn.map((barn) => (
              <FilRad
                key={barn.id}
                node={barn}
                nivå={nivå + 1}
                fokusertId={fokusertId}
                åpneMapper={åpneMapper}
                onToggle={onToggle}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li role="none">
      <a
        role="treeitem"
        href={node.sharepointUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 no-underline hover:bg-ax-bg-neutral-moderate-hover transition-colors text-ax-text-default"
        style={{ paddingLeft: `${(nivå - 1) * 1.5 + 0.5 + 1.75}rem` }}
        aria-level={nivå}
        tabIndex={erFokusert ? 0 : -1}
        data-tree-id={node.id}
      >
        <FilIkon node={node} aria-hidden className="shrink-0" />
        <BodyShort size="small" className="truncate flex-1">
          {node.navn}
        </BodyShort>
        <HStack gap="space-8" align="center" className="shrink-0">
          <Tag variant="info" size="xsmall">
            {formatNavn[node.format]}
          </Tag>
          <Detail className="text-ax-text-neutral-subtle whitespace-nowrap">
            {formaterDato(node.endretDato)} – {node.endretAv}
          </Detail>
        </HStack>
      </a>
    </li>
  );
}

export function FilTre({ noder }: { noder: FilNode[] }) {
  const [åpneMapper, setÅpneMapper] = useState<Set<string>>(new Set());
  const [fokusertId, setFokusertId] = useState<string | null>(noder[0]?.id ?? null);
  const treRef = useRef<HTMLUListElement>(null);

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
    <ul
      className="flex flex-col"
      role="tree"
      aria-label="Filstruktur"
      ref={treRef}
      onKeyDown={handleKeyDown}
    >
      {noder.map((node) => (
        <FilRad
          key={node.id}
          node={node}
          nivå={1}
          fokusertId={fokusertId}
          åpneMapper={åpneMapper}
          onToggle={toggleMappe}
        />
      ))}
    </ul>
  );
}
