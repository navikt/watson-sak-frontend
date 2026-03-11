import {
  ArrowForwardIcon,
  ArrowRightIcon,
  PersonPencilIcon,
  XMarkOctagonIcon,
} from "@navikt/aksel-icons";
import { ActionMenu } from "@navikt/ds-react";
import { useState } from "react";
import type { Sak } from "~/saker/typer";
import { EndreStatusModal } from "~/saker/handlinger/EndreStatusModal";
import { HenleggModal } from "~/saker/handlinger/HenleggModal";
import { erAktivSak, hentNesteStatus } from "~/saker/handlinger/tilgjengeligeHandlinger";
import { TildelSaksbehandlerModal } from "~/saker/handlinger/TildelSaksbehandlerModal";
import { VideresendTilSeksjonModal } from "~/saker/handlinger/VideresendTilSeksjonModal";

interface SakHandlingerProps {
  sak: Sak;
  saksbehandlere: string[];
  seksjoner: string[];
}

/** Handlingsmeny for en sak i listevisiningen */
export function SakHandlinger({ sak, saksbehandlere, seksjoner }: SakHandlingerProps) {
  const [åpenModal, setÅpenModal] = useState<"tildel" | "videresend" | "status" | "henlegg" | null>(
    null,
  );

  if (!erAktivSak(sak.status)) return null;

  const nesteStatus = hentNesteStatus(sak.status);

  return (
    <>
      <ActionMenu.Item
        onSelect={() => setÅpenModal("tildel")}
        icon={<PersonPencilIcon aria-hidden />}
      >
        Tildel saksbehandler
      </ActionMenu.Item>
      <ActionMenu.Item
        onSelect={() => setÅpenModal("videresend")}
        icon={<ArrowForwardIcon aria-hidden />}
      >
        Videresend til seksjon
      </ActionMenu.Item>
      {nesteStatus && (
        <ActionMenu.Item
          onSelect={() => setÅpenModal("status")}
          icon={<ArrowRightIcon aria-hidden />}
        >
          Flytt til {nesteStatus}
        </ActionMenu.Item>
      )}
      <ActionMenu.Divider />
      <ActionMenu.Item
        onSelect={() => setÅpenModal("henlegg")}
        icon={<XMarkOctagonIcon aria-hidden />}
      >
        Henlegg
      </ActionMenu.Item>

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
