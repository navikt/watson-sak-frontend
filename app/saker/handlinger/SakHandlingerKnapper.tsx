import type { FilNode } from "~/saker/filer/typer";
import type { KontrollsakResponse } from "~/saker/types.backend";
import type { SakHendelse } from "~/saker/historikk/typer";
import { UfordeltSakHandlinger } from "./UfordeltSakHandlinger";
import { SakUtredesHandlinger } from "./SakUtredesHandlinger";
import { SakIBeroHandlinger } from "./SakIBeroHandlinger";

interface SakHandlingerKnapperProps {
  sak: KontrollsakResponse;
  seksjoner: string[];
  historikk: SakHendelse[];
  filer: FilNode[];
}

export function SakHandlingerKnapper({
  sak,
  seksjoner,
  historikk: _historikk,
  filer: _filer,
}: SakHandlingerKnapperProps) {
  if (sak.status === "AVSLUTTET") {
    return null;
  }

  if (sak.blokkert !== null) {
    return <SakIBeroHandlinger sak={sak} />;
  }

  if (sak.saksbehandlere.eier === null) {
    return <UfordeltSakHandlinger sak={sak} seksjoner={seksjoner} />;
  }

  return <SakUtredesHandlinger sak={sak} />;
}
