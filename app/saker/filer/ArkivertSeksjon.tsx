import {
  ArchiveIcon,
  FileTextIcon,
  InboxDownIcon,
  PaperplaneIcon,
  PencilIcon,
} from "@navikt/aksel-icons";
import { BodyShort, Box, Detail, HStack, Link, Tag, VStack } from "@navikt/ds-react";
import type { ReactNode } from "react";
import { Link as RouterLink } from "react-router";
import { formaterJournalposttype } from "~/saker/handlinger/opprett-formatering";
import { RouteConfig } from "~/routeConfig";
import { formaterStorrelse } from "~/utils/number-utils";
import { DokumentIkon } from "./dokument-ikon";
import { filTypeIkon, filTypeTekst } from "./fil-type-utils";
import { FilerRad, FilerSeksjonCaption } from "./FilerRad";
import { ÅpneFilKnapp, formaterDato } from "./fil-visning-utils";
import type { DokumentNode, FilResponse, JournalpostReferanse } from "./typer";

interface ArkivertSeksjonProps {
  /** Filer (opplastede vedlegg og PDF-snapshots generert fra dokumenter) som er arkivert. */
  filer: FilResponse[];
  /** Dokumenter som er arkivert, men som ikke (ennå) har fått en tilhørende arkivert PDF-fil i
   * `filer` — vises likevel her, med lenke til dokumentet, slik at de ikke forsvinner fra visningen. */
  dokumenterUtenFil: DokumentNode[];
  /** Journalpostene på saken. Arkiverte elementer grupperes under journalposten de hører til. */
  journalposter?: JournalpostReferanse[];
  sakId: string;
}

type ArkivertVedlegg =
  | { kind: "fil"; fil: FilResponse }
  | { kind: "dokument"; dokument: DokumentNode };

type Journalpostgruppe = {
  journalpostId: string | null;
  tittel: string;
  journalposttype: string | null;
  dato: string | null;
  vedlegg: ArkivertVedlegg[];
};

const sammenlign = new Intl.Collator("nb", { numeric: true, sensitivity: "base" }).compare;

function vedleggsnavn(vedlegg: ArkivertVedlegg) {
  return vedlegg.kind === "fil" ? vedlegg.fil.filnavn : vedlegg.dokument.tittel || "Uten tittel";
}

function vedleggsdato(vedlegg: ArkivertVedlegg) {
  return (vedlegg.kind === "fil" ? vedlegg.fil.arkivert : vedlegg.dokument.arkivert) ?? null;
}

/**
 * Grupperer arkiverte elementer per journalpost. Journalposter uten arkiverte elementer vises
 * også. Elementer som peker på en journalpost vi ikke kjenner (eller ingen), får egne grupper,
 * slik at ingenting forsvinner fra visningen.
 */
function grupperPerJournalpost(
  journalposter: JournalpostReferanse[],
  vedlegg: ArkivertVedlegg[],
): Journalpostgruppe[] {
  const grupper = new Map<string | null, Journalpostgruppe>();
  for (const journalpost of journalposter) {
    grupper.set(journalpost.journalpostId, {
      journalpostId: journalpost.journalpostId,
      tittel: journalpost.tittel,
      journalposttype: journalpost.journalposttype,
      dato: journalpost.opprettet,
      vedlegg: [],
    });
  }

  for (const element of vedlegg) {
    const journalpostId =
      (element.kind === "fil"
        ? element.fil.arkivertJournalpostId
        : element.dokument.arkivertJournalpostId) ?? null;
    let gruppe = grupper.get(journalpostId);
    if (!gruppe) {
      gruppe = {
        journalpostId,
        tittel: journalpostId ? `Journalpost ${journalpostId}` : "Annet arkivert",
        journalposttype: null,
        dato: null,
        vedlegg: [],
      };
      grupper.set(journalpostId, gruppe);
    }
    gruppe.vedlegg.push(element);
    // Grupper uten kjent journalpost får datoen til det sist arkiverte elementet.
    const dato = vedleggsdato(element);
    if (gruppe.journalposttype === null && dato && (!gruppe.dato || dato > gruppe.dato)) {
      gruppe.dato = dato;
    }
  }

  for (const gruppe of grupper.values()) {
    gruppe.vedlegg.sort((a, b) => sammenlign(vedleggsnavn(a), vedleggsnavn(b)));
  }
  return [...grupper.values()].sort((a, b) => (b.dato ?? "").localeCompare(a.dato ?? ""));
}

function antallVedleggTekst(antall: number) {
  return antall === 1 ? "1 vedlegg" : `${antall} vedlegg`;
}

const JOURNALPOSTTYPE_IKON: Record<string, ReactNode> = {
  INNGAAENDE: <InboxDownIcon aria-hidden />,
  UTGAAENDE: <PaperplaneIcon aria-hidden />,
  NOTAT: <PencilIcon aria-hidden />,
};

function JournalpostKort({ gruppe, sakId }: { gruppe: Journalpostgruppe; sakId: string }) {
  const undertekst = [
    gruppe.journalpostId && `Journalpost ${gruppe.journalpostId}`,
    gruppe.dato && `Arkivert ${formaterDato(gruppe.dato)}`,
    antallVedleggTekst(gruppe.vedlegg.length),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li>
      <Box
        background="neutral-soft"
        borderWidth="1"
        borderColor="neutral-subtle"
        borderRadius="8"
        paddingInline="space-16"
      >
        <HStack align="center" gap="space-12" wrap={false} className="py-3">
          <ArchiveIcon aria-hidden className="size-5 shrink-0 text-ax-icon-neutral" />
          <div className="min-w-0 flex-1">
            <BodyShort weight="semibold" className="truncate">
              {gruppe.tittel}
            </BodyShort>
            <Detail className="truncate text-ax-text-neutral-subtle">{undertekst}</Detail>
          </div>
          {gruppe.journalposttype && (
            <Tag
              variant="moderate"
              data-color="info"
              size="small"
              icon={JOURNALPOSTTYPE_IKON[gruppe.journalposttype] ?? <FileTextIcon aria-hidden />}
              className="shrink-0"
            >
              {formaterJournalposttype(gruppe.journalposttype)}
            </Tag>
          )}
        </HStack>
        {gruppe.vedlegg.length > 0 && (
          <ul
            className="flex flex-col border-t border-ax-border-neutral-subtle py-2"
            aria-label={`Vedlegg i ${gruppe.tittel}`}
          >
            {gruppe.vedlegg.map((vedlegg) =>
              vedlegg.kind === "fil" ? (
                <FilerRad
                  key={`fil-${vedlegg.fil.id}`}
                  type="arkivert"
                  ikon={filTypeIkon(vedlegg.fil.contentType)}
                  tittel={vedlegg.fil.filnavn}
                  metadata={`Vedlegg · ${filTypeTekst(vedlegg.fil.contentType)} · ${formaterStorrelse(
                    vedlegg.fil.storrelse,
                  )}`}
                  handlinger={
                    <ÅpneFilKnapp
                      filId={vedlegg.fil.id}
                      filnavn={vedlegg.fil.filnavn}
                      sakId={sakId}
                    />
                  }
                />
              ) : (
                <FilerRad
                  key={`dokument-${vedlegg.dokument.id}`}
                  type="arkivert"
                  ikon={DokumentIkon}
                  tittel={
                    <Link
                      as={RouterLink}
                      to={RouteConfig.SAKER_DOKUMENT.replace(":sakId", sakId).replace(
                        ":docId",
                        vedlegg.dokument.id,
                      )}
                    >
                      {vedlegg.dokument.tittel || "Uten tittel"}
                    </Link>
                  }
                  metadata="Vedlegg · Dokument"
                />
              ),
            )}
          </ul>
        )}
      </Box>
    </li>
  );
}

/**
 * Viser journalpostene på saken, med arkiverte filer og dokumenter gruppert under journalposten
 * de ble arkivert i. Arkiverte elementer kan bare åpnes. De kan ikke redigeres, flyttes eller
 * slettes, og vises bare her.
 */
export function ArkivertSeksjon({
  filer,
  dokumenterUtenFil,
  journalposter = [],
  sakId,
}: ArkivertSeksjonProps) {
  const vedlegg: ArkivertVedlegg[] = [
    ...filer.map((fil): ArkivertVedlegg => ({ kind: "fil", fil })),
    ...dokumenterUtenFil.map((dokument): ArkivertVedlegg => ({ kind: "dokument", dokument })),
  ];
  const grupper = grupperPerJournalpost(journalposter, vedlegg);

  if (grupper.length === 0) {
    return null;
  }

  return (
    <VStack gap="space-8">
      <FilerSeksjonCaption
        tittel="Arkivert"
        undertekst="Journalført i dokumentarkiv – koblet til journalpost"
      />
      <ul className="flex flex-col gap-2" aria-label="Arkivert">
        {grupper.map((gruppe) => (
          <JournalpostKort key={gruppe.journalpostId ?? "ukjent"} gruppe={gruppe} sakId={sakId} />
        ))}
      </ul>
    </VStack>
  );
}
