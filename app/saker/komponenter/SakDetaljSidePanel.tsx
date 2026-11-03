import { VStack } from "@navikt/ds-react";
import { Feilmelding } from "~/feilhåndtering/Feilmelding";
import type { Seksjonsfeil } from "~/saker/SakDetaljSide.loader.server";
import { IngenHistorikktilgangKort } from "~/saker/historikk/IngenHistorikktilgangKort";
import { SakHistorikk } from "~/saker/historikk/SakHistorikk";
import type {
  KontrollsakResponse,
  KontrollsakSaksbehandler,
  TillatteHandlingerResponse,
} from "~/saker/types.backend";
import type { SakHendelse } from "../historikk/typer";
import { SaksbehandlereKort } from "./SaksbehandlereKort";

interface SakDetaljSidePanelProps {
  sak: KontrollsakResponse;
  saksbehandlerDetaljer: KontrollsakSaksbehandler[];
  ansvarligSaksbehandler: KontrollsakSaksbehandler | null;
  tillatteHandlinger: TillatteHandlingerResponse;
  historikk: SakHendelse[];
  erEier: boolean;
  kanTildeleSak: boolean;
  kanRedigere: boolean;
  kanLeggeTilHistorikk: boolean;
  historikkTilstand: "vis" | "ikke-delt" | "ingen-persontilgang";
  seksjonsfeil?: Seksjonsfeil;
}

export function SakDetaljSidePanel({
  sak,
  saksbehandlerDetaljer,
  ansvarligSaksbehandler,
  tillatteHandlinger,
  historikk,
  erEier,
  kanTildeleSak,
  kanRedigere,
  kanLeggeTilHistorikk,
  historikkTilstand,
  seksjonsfeil = {},
}: SakDetaljSidePanelProps) {
  return (
    <VStack gap="space-20" className="md:sticky md:top-4 md:self-start">
      {seksjonsfeil.saksbehandlere && (
        <Feilmelding
          headingLevel="2"
          tittel="Vi fikk ikke hentet saksbehandlerne"
          feilId={seksjonsfeil.saksbehandlere}
          kanPrøveIgjen
        >
          Navn og enhet kan mangle i saken. Prøv igjen om litt.
        </Feilmelding>
      )}
      <SaksbehandlereKort
        sak={sak}
        saksbehandlerDetaljer={saksbehandlerDetaljer}
        ansvarligSaksbehandler={ansvarligSaksbehandler}
        erEier={erEier}
        kanTildeleSak={kanTildeleSak}
        tillatteHandlinger={tillatteHandlinger}
      />

      {historikkTilstand === "vis" && seksjonsfeil.historikk ? (
        <Feilmelding
          headingLevel="2"
          tittel="Vi fikk ikke hentet historikken for saken"
          feilId={seksjonsfeil.historikk}
          kanPrøveIgjen
        >
          Resten av saken kan du jobbe med som vanlig. Prøv igjen om litt.
        </Feilmelding>
      ) : historikkTilstand === "vis" ? (
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
