import { DocPencilIcon, TasklistIcon } from "@navikt/aksel-icons";
import { Button, Heading, VStack } from "@navikt/ds-react";
import { useState } from "react";
import type { DokumentNode, FilResponse } from "~/saker/filer/typer";
import type { KontrollsakResponse, TillatteHandlingerResponse } from "~/saker/types.backend";
import { EndreStatusModal } from "./EndreStatusModal";
import { erHenlagtIGjeldendeSteg, hentVisbareSteg } from "./tillatte-steg";
import { OpprettJournalpostModal } from "./OpprettJournalpostModal";
import { OpprettOppgaveModal } from "./OpprettOppgaveModal";
import { hentTilgjengeligeSakshandlinger, type Sakshandling } from "./tilgjengeligeHandlinger";

interface SakHandlingerKnapperProps {
  sak: KontrollsakResponse;
  tillatteHandlinger: TillatteHandlingerResponse;
  erEier: boolean;
  filer: FilResponse[];
  dokumenter: DokumentNode[];
}

type ModalHandling = Extract<Sakshandling, "opprett-journalpost" | "opprett-oppgave">;
type Tilstandshandling = TillatteHandlingerResponse["handlinger"][number]["type"];

const handlingsvisning: Record<
  ModalHandling,
  {
    label: string;
    variant: "primary" | "secondary" | "secondary-neutral";
    icon: React.ReactNode;
  }
> = {
  "opprett-journalpost": {
    label: "Opprett journalpost",
    variant: "secondary-neutral",
    icon: <DocPencilIcon aria-hidden />,
  },
  "opprett-oppgave": {
    label: "Opprett oppgave",
    variant: "secondary-neutral",
    icon: <TasklistIcon aria-hidden />,
  },
};

const sekundærhandlinger: ModalHandling[] = ["opprett-journalpost", "opprett-oppgave"];

export function SakHandlingerKnapper({
  sak,
  tillatteHandlinger,
  erEier,
  filer,
  dokumenter,
}: SakHandlingerKnapperProps) {
  const [åpenModal, setÅpenModal] = useState<ModalHandling | null>(null);
  const [åpenTilstandshandling, setÅpenTilstandshandling] = useState<Tilstandshandling | null>(
    null,
  );
  const handlinger = hentTilgjengeligeSakshandlinger(sak).filter(
    (handling): handling is ModalHandling =>
      handling === "opprett-journalpost" || handling === "opprett-oppgave",
  );
  const primærhandlinger = handlinger.filter((handling) => !sekundærhandlinger.includes(handling));
  const visSekundærhandlinger = handlinger.some((h) => sekundærhandlinger.includes(h));
  const tilstandshandlinger = tillatteHandlinger.handlinger.filter(
    (handling) =>
      (handling.type !== "FLYTT_TIL_NESTE_STEG" ||
        hentVisbareSteg(tillatteHandlinger).length > 0) &&
      (handling.type !== "HENLEGG" || !erHenlagtIGjeldendeSteg(tillatteHandlinger.tilstand)),
  );

  if (!erEier || (handlinger.length === 0 && tilstandshandlinger.length === 0)) {
    return null;
  }

  function handleKlikk(handling: ModalHandling) {
    setÅpenModal(handling);
  }

  return (
    <>
      <VStack gap="space-4" align="stretch">
        <Heading level="2" size="small">
          Handlinger
        </Heading>

        {tilstandshandlinger.map((handling) => {
          const etiketter: Record<Tilstandshandling, string> = {
            FLYTT_TIL_NESTE_STEG: "Flytt til neste steg",
            ENDRE_STATUS: "Endre status",
            REGISTRER_RESULTAT: "Registrer resultat",
            HENLEGG: "Registrer henleggelse",
            SETT_I_BERO: "Sett i bero",
            TA_UT_AV_BERO: "Ta ut av bero",
          };
          return (
            <Button
              key={handling.type}
              variant={handling.type === "FLYTT_TIL_NESTE_STEG" ? "primary" : "secondary-neutral"}
              size="medium"
              data-color={handling.type === "HENLEGG" ? "danger" : undefined}
              onClick={() => setÅpenTilstandshandling(handling.type)}
            >
              {etiketter[handling.type]}
            </Button>
          );
        })}

        {primærhandlinger.map((handling) => {
          const visning = handlingsvisning[handling];

          return (
            <Button
              key={handling}
              variant={visning.variant}
              size="medium"
              icon={visning.icon}
              onClick={() => handleKlikk(handling)}
            >
              {visning.label}
            </Button>
          );
        })}

        {visSekundærhandlinger ? (
          <>
            <hr className="my-4 border-ax-border-neutral-subtle" />
            {sekundærhandlinger
              .filter((h) => handlinger.includes(h))
              .map((handling) => {
                const visning = handlingsvisning[handling];
                return (
                  <Button
                    key={handling}
                    variant={visning.variant}
                    size="medium"
                    icon={visning.icon}
                    onClick={() => handleKlikk(handling)}
                  >
                    {visning.label}
                  </Button>
                );
              })}
          </>
        ) : null}
      </VStack>

      <EndreStatusModal
        sakId={String(sak.id)}
        tillatteHandlinger={tillatteHandlinger}
        handling={åpenTilstandshandling}
        onClose={() => setÅpenTilstandshandling(null)}
      />
      <OpprettJournalpostModal
        sakId={String(sak.id)}
        åpen={åpenModal === "opprett-journalpost"}
        onClose={() => setÅpenModal(null)}
        filer={filer}
        dokumenter={dokumenter}
      />
      <OpprettOppgaveModal
        sakId={String(sak.id)}
        åpen={åpenModal === "opprett-oppgave"}
        onClose={() => setÅpenModal(null)}
      />
    </>
  );
}
