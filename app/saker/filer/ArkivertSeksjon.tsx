import { ArchiveIcon } from "@navikt/aksel-icons";
import { Link } from "@navikt/ds-react";
import { Link as RouterLink } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { formaterStorrelse } from "~/utils/number-utils";
import { FilerRad, FilerSeksjonCaption } from "./FilerRad";
import { ÅpneFilKnapp, formaterDato } from "./fil-visning-utils";
import type { DokumentNode, FilResponse } from "./typer";

interface ArkivertSeksjonProps {
  /** Filer (opplastede vedlegg og PDF-snapshots generert fra dokumenter) som er arkivert. */
  filer: FilResponse[];
  /** Dokumenter som er arkivert, men som ikke (ennå) har fått en tilhørende arkivert PDF-fil i
   * `filer` — vises likevel her, med lenke til dokumentet, slik at de ikke forsvinner fra visningen. */
  dokumenterUtenFil: DokumentNode[];
  sakId: string;
}

type ArkivertOppføring =
  | { kind: "fil"; dato: string; fil: FilResponse }
  | { kind: "dokument"; dato: string; dokument: DokumentNode };

/**
 * Viser filer (vedlegg og dokument-genererte PDF-er) og dokumenter som er arkivert i en
 * journalpost. Arkiverte elementer kan kun åpnes/lastes ned eller ses — de kan ikke redigeres
 * eller slettes, og vises kun her (ikke i sine opprinnelige lister).
 */
export function ArkivertSeksjon({ filer, dokumenterUtenFil, sakId }: ArkivertSeksjonProps) {
  const oppføringer: ArkivertOppføring[] = [
    ...filer.map((fil): ArkivertOppføring => ({ kind: "fil", dato: fil.arkivert ?? "", fil })),
    ...dokumenterUtenFil.map(
      (dokument): ArkivertOppføring => ({
        kind: "dokument",
        dato: dokument.arkivert ?? "",
        dokument,
      }),
    ),
  ];

  if (oppføringer.length === 0) {
    return null;
  }

  const sortert = [...oppføringer].sort((a, b) => b.dato.localeCompare(a.dato));

  return (
    <div>
      <FilerSeksjonCaption
        tittel="Arkivert"
        undertekst="Lastet opp i dokumentarkiv – kan ikke endres"
      />
      <ul className="flex flex-col" aria-label="Arkivert">
        {sortert.map((oppføring) =>
          oppføring.kind === "fil" ? (
            <FilerRad
              key={`fil-${oppføring.fil.id}`}
              type="arkivert"
              ikon={ArchiveIcon}
              tittel={oppføring.fil.filnavn}
              metadata={`${formaterStorrelse(oppføring.fil.storrelse)} · Arkivert ${formaterDato(
                oppføring.fil.arkivert ?? "",
              )} · ${oppføring.fil.arkivertAv ?? ""}`}
              handlinger={
                <ÅpneFilKnapp
                  filId={oppføring.fil.id}
                  filnavn={oppføring.fil.filnavn}
                  sakId={sakId}
                />
              }
            />
          ) : (
            <FilerRad
              key={`dokument-${oppføring.dokument.id}`}
              type="arkivert"
              ikon={ArchiveIcon}
              tittel={
                <Link
                  as={RouterLink}
                  to={RouteConfig.SAKER_DOKUMENT.replace(":sakId", sakId).replace(
                    ":docId",
                    oppføring.dokument.id,
                  )}
                >
                  {oppføring.dokument.tittel || "Uten tittel"}
                </Link>
              }
              metadata={`Arkivert ${formaterDato(oppføring.dokument.arkivert ?? "")} · ${
                oppføring.dokument.arkivertAv ?? ""
              }`}
            />
          ),
        )}
      </ul>
    </div>
  );
}
