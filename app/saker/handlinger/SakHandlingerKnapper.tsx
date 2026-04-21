import type { FilNode } from "~/saker/filer/typer";
import type { KontrollsakResponse } from "~/saker/types.backend";
import type { KontrollsakSaksbehandler } from "~/saker/types.backend";
import type { SakHendelse } from "~/saker/historikk/typer";
import {
  erAktivSakKontrollsak,
  hentStøttedeTilgjengeligeHandlinger,
} from "./tilgjengeligeHandlinger";
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
  historikk: _historikk,
  filer: _filer,
}: SakHandlingerKnapperProps) {
  const tilgjengeligeHandlinger = hentStøttedeTilgjengeligeHandlinger(sak);

  if (!erAktivSakKontrollsak(sak.status) || tilgjengeligeHandlinger.length === 0) return null;

  if (tilgjengeligeHandlinger.some((handling) => handling.handling === "TILDEL")) {
    return (
      <UfordeltSakHandlinger
        sak={sak}
        saksbehandlere={saksbehandlere}
        saksbehandlerDetaljer={saksbehandlerDetaljer}
        seksjoner={seksjoner}
      />
    );
  }

  if (tilgjengeligeHandlinger.some((handling) => handling.handling === "FORTSETT_FRA_I_BERO")) {
    return <SakIBeroHandlinger sak={sak} tilgjengeligeHandlinger={tilgjengeligeHandlinger} />;
  }

  return (
    <SakUtredesHandlinger
      sak={sak}
      saksbehandlere={saksbehandlere}
      saksbehandlerDetaljer={saksbehandlerDetaljer}
      tilgjengeligeHandlinger={tilgjengeligeHandlinger}
    />
  );
}
