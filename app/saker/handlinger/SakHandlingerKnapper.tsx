import {
  ArrowForwardIcon,
  ArrowRightIcon,
  PersonPencilIcon,
  XMarkOctagonIcon,
} from "@navikt/aksel-icons";
import { Button, Heading, VStack } from "@navikt/ds-react";
import { useState } from "react";
import type { Sak } from "~/saker/typer";
import { EndreStatusModal } from "./EndreStatusModal";
import { HenleggModal } from "./HenleggModal";
import { erAktivSak, hentNesteStatus } from "./tilgjengeligeHandlinger";
import { TildelSaksbehandlerModal } from "./TildelSaksbehandlerModal";
import { VideresendTilSeksjonModal } from "./VideresendTilSeksjonModal";

interface SakHandlingerKnapperProps {
  sak: Sak;
  saksbehandlere: string[];
  seksjoner: string[];
}

type ÅpenModal = "tildel" | "videresend" | "status" | "henlegg" | null;

export function SakHandlingerKnapper({
  sak,
  saksbehandlere,
  seksjoner,
}: SakHandlingerKnapperProps) {
  const [åpenModal, setÅpenModal] = useState<ÅpenModal>(null);

  if (!erAktivSak(sak.status)) return null;

  const nesteStatus = hentNesteStatus(sak.status);

  return (
    <>
      <VStack gap="space-4" align="stretch">
        <Heading level="2" size="small">
          Handlinger
        </Heading>
        <Button
          variant="secondary"
          size="small"
          icon={<PersonPencilIcon aria-hidden />}
          onClick={() => setÅpenModal("tildel")}
        >
          Tildel saksbehandler
        </Button>
        <Button
          variant="secondary"
          size="small"
          icon={<ArrowForwardIcon aria-hidden />}
          onClick={() => setÅpenModal("videresend")}
        >
          Videresend til seksjon
        </Button>
        {nesteStatus && (
          <Button
            variant="secondary"
            size="small"
            icon={<ArrowRightIcon aria-hidden />}
            onClick={() => setÅpenModal("status")}
          >
            Flytt til {nesteStatus}
          </Button>
        )}
        <Button
          variant="danger"
          size="small"
          icon={<XMarkOctagonIcon aria-hidden />}
          onClick={() => setÅpenModal("henlegg")}
        >
          Henlegg
        </Button>
      </VStack>

      <TildelSaksbehandlerModal
        sakId={sak.id}
        saksbehandlere={saksbehandlere}
        åpen={åpenModal === "tildel"}
        onClose={() => setÅpenModal(null)}
      />
      <VideresendTilSeksjonModal
        sakId={sak.id}
        nåværendeSeksjon={sak.seksjon}
        seksjoner={seksjoner}
        åpen={åpenModal === "videresend"}
        onClose={() => setÅpenModal(null)}
      />
      {nesteStatus && (
        <EndreStatusModal
          sakId={sak.id}
          nåværendeStatus={sak.status}
          åpen={åpenModal === "status"}
          onClose={() => setÅpenModal(null)}
        />
      )}
      <HenleggModal
        sakId={sak.id}
        åpen={åpenModal === "henlegg"}
        onClose={() => setÅpenModal(null)}
      />
    </>
  );
}
