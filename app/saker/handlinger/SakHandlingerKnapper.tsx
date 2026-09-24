import { DocPencilIcon, TasklistIcon } from "@navikt/aksel-icons";
import { Button, Heading, VStack } from "@navikt/ds-react";
import { useState } from "react";
import type { DokumentNode, FilResponse } from "~/saker/filer/typer";
import type { KontrollsakResponse, TillatteHandlingerResponse } from "~/saker/types.backend";
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

type ModalHandling = Sakshandling;

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
  erEier,
  filer,
  dokumenter,
}: SakHandlingerKnapperProps) {
  const [åpenModal, setÅpenModal] = useState<ModalHandling | null>(null);
  const handlinger = hentTilgjengeligeSakshandlinger(sak);
  const primærhandlinger = handlinger.filter((handling) => !sekundærhandlinger.includes(handling));
  const visSekundærhandlinger = handlinger.some((h) => sekundærhandlinger.includes(h));

  if (!erEier || handlinger.length === 0) {
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

        {visSekundærhandlinger
          ? sekundærhandlinger
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
              })
          : null}
      </VStack>

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
