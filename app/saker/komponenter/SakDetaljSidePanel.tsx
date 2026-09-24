import { VStack } from "@navikt/ds-react";
import { SakHandlingerKnapper } from "~/saker/handlinger/SakHandlingerKnapper";
import { IngenHistorikktilgangKort } from "~/saker/historikk/IngenHistorikktilgangKort";
import { SakHistorikk } from "~/saker/historikk/SakHistorikk";
import type {
  KontrollsakResponse,
  KontrollsakSaksbehandler,
  TillatteHandlingerResponse,
} from "~/saker/types.backend";
import type { DokumentNode, FilResponse } from "../filer/typer";
import type { SakHendelse } from "../historikk/typer";
import { SaksbehandlereKort } from "./SaksbehandlereKort";

interface SakDetaljSidePanelProps {
  sak: KontrollsakResponse;
  saksbehandlerDetaljer: KontrollsakSaksbehandler[];
  ansvarligSaksbehandler: KontrollsakSaksbehandler | null;
  tillatteHandlinger: TillatteHandlingerResponse;
  historikk: SakHendelse[];
  dokumenter: DokumentNode[];
  filer: FilResponse[];
  erEier: boolean;
  kanTildeleSak: boolean;
  kanRedigere: boolean;
  kanLeggeTilHistorikk: boolean;
  historikkTilstand: "vis" | "ikke-delt" | "skjermet";
}

export function SakDetaljSidePanel({
  sak,
  saksbehandlerDetaljer,
  ansvarligSaksbehandler,
  tillatteHandlinger,
  historikk,
  dokumenter,
  filer,
  erEier,
  kanTildeleSak,
  kanRedigere,
  kanLeggeTilHistorikk,
  historikkTilstand,
}: SakDetaljSidePanelProps) {
  return (
    <VStack gap="space-20" className="md:sticky md:top-4 md:self-start">
      <SaksbehandlereKort
        sak={sak}
        saksbehandlerDetaljer={saksbehandlerDetaljer}
        ansvarligSaksbehandler={ansvarligSaksbehandler}
        erEier={erEier}
        kanTildeleSak={kanTildeleSak}
        tillatteHandlinger={tillatteHandlinger}
      />

      <SakHandlingerKnapper
        sak={sak}
        tillatteHandlinger={tillatteHandlinger}
        erEier={erEier}
        filer={filer}
        dokumenter={dokumenter}
      />

      {historikkTilstand === "vis" ? (
        <SakHistorikk
          sakId={sak.id}
          hendelser={historikk}
          redigerbar={kanRedigere}
          kanLeggeTil={kanLeggeTilHistorikk}
        />
      ) : (
        <IngenHistorikktilgangKort årsak={historikkTilstand} />
      )}
    </VStack>
  );
}
