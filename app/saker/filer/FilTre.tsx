import { ChevronDownIcon, ChevronRightIcon } from "@navikt/aksel-icons";
import { BodyShort, Detail, HStack, Link, Tag } from "@navikt/ds-react";
import { useState } from "react";
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

function FilRad({ node, nivå = 0 }: { node: FilNode; nivå?: number }) {
  const [åpen, setÅpen] = useState(false);

  if (node.type === "mappe") {
    return (
      <div>
        <button
          type="button"
          onClick={() => setÅpen((prev) => !prev)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-ax-bg-neutral-moderate-hover transition-colors cursor-pointer"
          style={{ paddingLeft: `${nivå * 1.5 + 0.5}rem` }}
          aria-expanded={åpen}
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
          <div>
            {node.barn.map((barn) => (
              <FilRad key={barn.id} node={barn} nivå={nivå + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      href={node.sharepointUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 no-underline hover:bg-ax-bg-neutral-moderate-hover transition-colors text-ax-text-default"
      style={{ paddingLeft: `${nivå * 1.5 + 0.5 + 1.75}rem` }}
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
    </Link>
  );
}

export function FilTre({ noder }: { noder: FilNode[] }) {
  return (
    <div className="flex flex-col" role="tree" aria-label="Filstruktur">
      {noder.map((node) => (
        <FilRad key={node.id} node={node} />
      ))}
    </div>
  );
}
