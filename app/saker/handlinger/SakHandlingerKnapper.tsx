import {
  ArrowRightIcon,
  ClockDashedIcon,
  DocPencilIcon,
  PencilIcon,
  TasklistIcon,
} from "@navikt/aksel-icons";
import { Button, Heading, VStack } from "@navikt/ds-react";
import { useState } from "react";
import { useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { EndreStatusModal } from "./EndreStatusModal";
import { OpprettJournalpostModal } from "./OpprettJournalpostModal";
import { OpprettOppgaveModal } from "./OpprettOppgaveModal";
import { SettPaVentModal } from "./SettPaVentModal";
import { hentTilgjengeligeSakshandlinger, type Sakshandling } from "./tilgjengeligeHandlinger";

interface SakHandlingerKnapperProps {
  sak: KontrollsakResponse;
  erEier: boolean;
}

type ModalHandling = Exclude<Sakshandling, "gjenoppta">;

const handlingsvisning: Record<
  Sakshandling,
  {
    label: string;
    variant: "primary" | "secondary" | "secondary-neutral";
    icon: React.ReactNode;
  }
> = {
  "endre-status": {
    label: "Endre status",
    variant: "primary",
    icon: <PencilIcon aria-hidden />,
  },
  "sett-pa-vent": {
    label: "Sett på vent",
    variant: "secondary",
    icon: <ClockDashedIcon aria-hidden />,
  },
  gjenoppta: {
    label: "Gjenoppta",
    variant: "primary",
    icon: <ArrowRightIcon aria-hidden />,
  },
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

const sekundærhandlinger: Sakshandling[] = ["opprett-journalpost", "opprett-oppgave"];

export function SakHandlingerKnapper({ sak, erEier }: SakHandlingerKnapperProps) {
  const gjenopptaFetcher = useFetcher();
  const [åpenModal, setÅpenModal] = useState<ModalHandling | null>(null);
  const handlinger = hentTilgjengeligeSakshandlinger(sak);
  const primærhandlinger = handlinger.filter((handling) => !sekundærhandlinger.includes(handling));
  const visSekundærhandlinger = handlinger.some((h) => sekundærhandlinger.includes(h));

  if (!erEier || handlinger.length === 0) {
    return null;
  }

  function handleGjenoppta() {
    gjenopptaFetcher.submit(
      { handling: "gjenoppta" },
      {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sak.id)),
      },
    );
  }

  function handleKlikk(handling: Sakshandling) {
    if (handling === "gjenoppta") {
      handleGjenoppta();
      return;
    }

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
              loading={handling === "gjenoppta" && gjenopptaFetcher.state !== "idle"}
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
        nåværendeStatus={sak.status}
        åpen={åpenModal === "endre-status"}
        onClose={() => setÅpenModal(null)}
      />
      <SettPaVentModal
        sakId={String(sak.id)}
        åpen={åpenModal === "sett-pa-vent"}
        onClose={() => setÅpenModal(null)}
      />
      <OpprettJournalpostModal
        sakId={String(sak.id)}
        åpen={åpenModal === "opprett-journalpost"}
        onClose={() => setÅpenModal(null)}
      />
      <OpprettOppgaveModal
        sakId={String(sak.id)}
        åpen={åpenModal === "opprett-oppgave"}
        onClose={() => setÅpenModal(null)}
      />
    </>
  );
}
