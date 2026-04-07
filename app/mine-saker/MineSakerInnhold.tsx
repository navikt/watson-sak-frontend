import {
  Buildings2Icon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EnvelopeClosedIcon,
  FilesIcon,
  FolderIcon,
  TasklistIcon,
} from "@navikt/aksel-icons";
import { BodyShort, Heading, HStack, Tag, VStack } from "@navikt/ds-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { getSaksreferanse } from "~/saker/id";
import { getStatus } from "~/saker/visning";
import type { KontrollsakResponse } from "~/saker/types.backend";
import {
  getMineSakerGruppeStatus,
  getMineSakerIkonType,
  getMineSakerOpprettetTekst,
  getMineSakerPeriodeTekst,
  getMineSakerTittel,
  getStatusVariantForSak,
} from "~/saker/selectors";

type SakGrupper = {
  aktive: KontrollsakResponse[];
  ventende: KontrollsakResponse[];
  fullførte: KontrollsakResponse[];
};

export function MineSakerInnhold({
  saker,
  detaljSti,
}: {
  saker: KontrollsakResponse[];
  detaljSti: string;
}) {
  const [viserVentende, setViserVentende] = useState(false);
  const [viserFullførte, setViserFullførte] = useState(false);
  const grupper = grupperSaker(saker);

  return (
    <section aria-labelledby="mine-saker-overskrift" className="pb-12">
      <HStack gap="space-4" align="center" className="mt-6 mb-6">
        <FolderIcon aria-hidden fontSize="1.25rem" className="text-ax-text-neutral" />
        <Heading id="mine-saker-overskrift" level="1" size="medium">
          Mine saker
        </Heading>
      </HStack>

      <VStack gap="space-8">
        <Heading level="2" size="small" className="sr-only">
          Aktive saker
        </Heading>
        <SakGrid
          saker={grupper.aktive}
          detaljSti={detaljSti}
          tomTekst="Du har ingen aktive saker."
        />

        <SammenleggbarSeksjon
          tittel="Oppgaver på vent"
          erÅpen={viserVentende}
          toggle={() => setViserVentende((åpen) => !åpen)}
        >
          <SakGrid
            saker={grupper.ventende}
            detaljSti={detaljSti}
            tomTekst="Du har ingen saker som venter."
          />
        </SammenleggbarSeksjon>

        <SammenleggbarSeksjon
          tittel="Fullførte oppgaver"
          erÅpen={viserFullførte}
          toggle={() => setViserFullførte((åpen) => !åpen)}
        >
          <SakGrid
            saker={grupper.fullførte}
            detaljSti={detaljSti}
            tomTekst="Du har ingen fullførte saker."
          />
        </SammenleggbarSeksjon>
      </VStack>
    </section>
  );
}

function grupperSaker(saker: KontrollsakResponse[]): SakGrupper {
  return {
    aktive: saker.filter((sak) => getMineSakerGruppeStatus(sak) === "aktive"),
    ventende: saker.filter((sak) => getMineSakerGruppeStatus(sak) === "ventende"),
    fullførte: saker.filter((sak) => getMineSakerGruppeStatus(sak) === "fullførte"),
  };
}

function SakGrid({
  saker,
  detaljSti,
  tomTekst,
}: {
  saker: KontrollsakResponse[];
  detaljSti: string;
  tomTekst: string;
}) {
  if (saker.length === 0) {
    return <BodyShort className="text-ax-text-neutral-subtle">{tomTekst}</BodyShort>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {saker.map((sak) => (
        <SakKort key={sak.id} sak={sak} detaljSti={detaljSti} />
      ))}
    </div>
  );
}

function SammenleggbarSeksjon({
  tittel,
  erÅpen,
  toggle,
  children,
}: {
  tittel: string;
  erÅpen: boolean;
  toggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <Heading level="2" size="small">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={erÅpen}
          className="flex items-center gap-3 rounded-md border-none bg-transparent p-0 text-left text-ax-text-neutral hover:text-ax-text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ax-border-accent"
        >
          {tittel}
          <ChevronDownIcon
            aria-hidden
            fontSize="1.25rem"
            className={`transition-transform duration-200 ${erÅpen ? "rotate-180" : ""}`}
          />
        </button>
      </Heading>

      {erÅpen && children}
    </section>
  );
}

function SakKort({ sak, detaljSti }: { sak: KontrollsakResponse; detaljSti: string }) {
  const ikonType = getMineSakerIkonType(sak);
  const Ikon =
    ikonType === "tasklist"
      ? TasklistIcon
      : ikonType === "envelope"
        ? EnvelopeClosedIcon
        : ikonType === "buildings"
          ? Buildings2Icon
          : ikonType === "folder"
            ? FolderIcon
            : FilesIcon;

  return (
    <Link
      to={`${detaljSti}/${getSaksreferanse(sak.id)}`}
      className="group flex min-h-32 items-start justify-between gap-4 rounded-xl border border-ax-border-neutral-subtle bg-ax-bg-default px-5 py-4 text-inherit no-underline transition-colors hover:border-ax-border-neutral hover:bg-ax-bg-neutral-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ax-border-accent"
    >
      <HStack gap="space-4" align="start" className="min-w-0 flex-1">
        <div className="pt-1 text-ax-text-neutral">
          <Ikon aria-hidden fontSize="1.875rem" />
        </div>

        <VStack gap="space-4" className="min-w-0">
          <VStack gap="space-2">
            <Heading
              size="xsmall"
              level="3"
              className="truncate underline decoration-1 underline-offset-3"
            >
              {getMineSakerTittel(sak)}
            </Heading>
            <BodyShort size="small" className="text-ax-text-neutral-subtle">
              {getMineSakerPeriodeTekst(sak)}
            </BodyShort>
          </VStack>

          <HStack gap="space-2" wrap>
            <StatusPille sak={sak} />
            <MetadataPille
              icon={<CalendarIcon aria-hidden fontSize="1rem" />}
              tekst={getMineSakerOpprettetTekst(sak)}
            />
          </HStack>
        </VStack>
      </HStack>

      <ChevronRightIcon
        aria-hidden
        fontSize="1.5rem"
        className="mt-1 shrink-0 text-ax-text-neutral transition-transform duration-200 group-hover:translate-x-1"
      />
    </Link>
  );
}

function MetadataPille({
  icon,
  tekst,
  className = "bg-ax-bg-neutral-moderate text-ax-text-neutral",
}: {
  icon?: ReactNode;
  tekst: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${className}`}
    >
      {icon}
      <span>{tekst}</span>
    </span>
  );
}

function StatusPille({ sak }: { sak: KontrollsakResponse }) {
  const variant = getStatusVariantForSak(sak);

  return (
    <Tag variant={variant} size="small">
      {getStatus(sak)}
    </Tag>
  );
}
