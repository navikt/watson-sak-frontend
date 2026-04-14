import type { KontrollsakResponse } from "~/saker/types.backend";
import { erAktivSakKontrollsak } from "./tilgjengeligeHandlinger";
import { UfordeltSakHandlinger } from "./UfordeltSakHandlinger";
import { SakUtredesHandlinger } from "./SakUtredesHandlinger";
import { SakIBeroHandlinger } from "./SakIBeroHandlinger";

interface SakHandlingerKnapperProps {
  sak: KontrollsakResponse;
  saksbehandlere: string[];
  seksjoner: string[];
}

export function SakHandlingerKnapper({ sak, saksbehandlere, seksjoner }: SakHandlingerKnapperProps) {
  if (!erAktivSakKontrollsak(sak.status)) return null;

  if (sak.status === "UTREDES") {
    return <SakUtredesHandlinger sak={sak} saksbehandlere={saksbehandlere} />;
  }

  if (sak.status === "I_BERO") {
    return <SakIBeroHandlinger sak={sak} />;
  }

  return <UfordeltSakHandlinger sak={sak} saksbehandlere={saksbehandlere} seksjoner={seksjoner} />;
}
