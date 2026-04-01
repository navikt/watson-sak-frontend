import { PersonPencilIcon } from "@navikt/aksel-icons";
import { Button, Heading, VStack } from "@navikt/ds-react";
import { useState } from "react";
import type { KontrollsakResponse } from "~/saker/types.backend";
import type { KontrollsakStatus } from "~/saker/visning";
import { erAktivSakKontrollsak } from "./tilgjengeligeHandlinger";
import { TildelSaksbehandlerModal } from "./TildelSaksbehandlerModal";

interface SakHandlingerKnapperProps {
  sak: KontrollsakResponse;
  saksbehandlere: string[];
  seksjoner: string[];
}

type ÅpenModal = "tildel" | null;

export function SakHandlingerKnapper({
  sak,
  saksbehandlere,
  seksjoner: _seksjoner,
}: SakHandlingerKnapperProps) {
  const [åpenModal, setÅpenModal] = useState<ÅpenModal>(null);
  const erAktiv = erAktivSakKontrollsak(sak.status as KontrollsakStatus);

  if (!erAktiv) return null;

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
      </VStack>

      <TildelSaksbehandlerModal
        sakId={sak.id}
        saksbehandlere={saksbehandlere}
        åpen={åpenModal === "tildel"}
        onClose={() => setÅpenModal(null)}
      />
    </>
  );
}
