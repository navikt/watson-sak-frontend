import type { FilNode } from "~/saker/filer/typer";
import type { KontrollsakResponse } from "~/saker/types.backend";
import type { KontrollsakSaksbehandler } from "~/saker/types.backend";
import type { SakHendelse } from "~/saker/historikk/typer";
import { erAktivSakKontrollsak } from "./tilgjengeligeHandlinger";
import { UfordeltSakHandlinger } from "./UfordeltSakHandlinger";
import { SakUtredesHandlinger } from "./SakUtredesHandlinger";
import { SakIBeroHandlinger } from "./SakIBeroHandlinger";

interface SakHandlingerKnapperProps {
  sak: KontrollsakResponse;
  saksbehandlere: string[];
  saksbehandlerDetaljer: KontrollsakSaksbehandler[];
  seksjoner: string[];
  historikk: SakHendelse[];
  filer: FilNode[];
}

export function SakHandlingerKnapper({
  sak,
  saksbehandlere,
  saksbehandlerDetaljer,
  seksjoner,
  historikk,
  filer,
}: SakHandlingerKnapperProps) {
  if (!erAktivSakKontrollsak(sak.status)) return null;

  if (sak.status === "UTREDES") {
    return (
      <SakUtredesHandlinger
        sak={sak}
        saksbehandlere={saksbehandlere}
        saksbehandlerDetaljer={saksbehandlerDetaljer}
        historikk={historikk}
        filer={filer}
      />
    );
  }

  if (sak.status === "I_BERO") {
    return <SakIBeroHandlinger sak={sak} />;
  }

  return <UfordeltSakHandlinger sak={sak} saksbehandlere={saksbehandlere} seksjoner={seksjoner} />;
}
