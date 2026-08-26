import { PlusCircleIcon } from "@navikt/aksel-icons";
import { Alert, BodyShort, Box, Button, Heading, HStack } from "@navikt/ds-react";
import { useState } from "react";
import { useFetcher } from "react-router";
import { useInnloggetBruker } from "~/auth/innlogget-bruker";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { useDisclosure } from "~/utils/useDisclosure";
import { HistorikkProsessListe } from "./HistorikkProsessListe";
import { LeggTilHistorikkModal } from "./LeggTilHistorikkModal";
import { RedigerHistorikkModal } from "./RedigerHistorikkModal";
import { VisAllHistorikkModal } from "./VisAllHistorikkModal";
import type { SakHendelse } from "./typer";

interface SakHistorikkProps {
  sakId: number;
  sak: KontrollsakResponse;
  hendelser: SakHendelse[];
  redigerbar: boolean;
}

const MAKS_SYNLIGE_HENDELSER = 5;

export function SakHistorikk({ sakId, sak, hendelser, redigerbar }: SakHistorikkProps) {
  const { erÅpen: leggTilÅpen, onÅpne: onÅpneLeggTil, onLukk: onLukkLeggTil } = useDisclosure();
  const { erÅpen: visAlleÅpen, onÅpne: onÅpneVisAlle, onLukk: onLukkVisAlle } = useDisclosure();
  const { erÅpen: redigerÅpen, onÅpne: onÅpneRediger, onLukk: onLukkRediger } = useDisclosure();
  const [valgtHendelse, setValgtHendelse] = useState<SakHendelse | null>(null);
  const innloggetBruker = useInnloggetBruker();
  const fetcher = useFetcher();
  const synligeHendelser = hendelser.slice(0, MAKS_SYNLIGE_HENDELSER);
  const slettFeilmelding =
    fetcher.state === "idle" && fetcher.data && "ok" in fetcher.data && !fetcher.data.ok
      ? fetcher.data.feil?.skjema?.[0]
      : undefined;

  const tomHistorikkMelding = sak?.adresseskjermet
    ? "Du må ha utvidet tilgang for å se historikk på skjermede saker."
    : "Ingen historikk for denne saken.";

  function åpneRediger(hendelse: SakHendelse) {
    setValgtHendelse(hendelse);
    onÅpneRediger();
  }

  function slettHendelse(hendelse: SakHendelse) {
    fetcher.submit(
      { handling: "slett_historikk", hendelseId: hendelse.hendelseId },
      {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId)),
      },
    );
  }

  return (
    <Box padding="space-6" borderRadius="8" background="raised">
      <HStack justify="space-between" align="center" className="mb-3">
        <Heading level="2" size="small">
          Historikk
        </Heading>
        {redigerbar && (
          <Button
            variant="tertiary"
            size="small"
            icon={<PlusCircleIcon aria-hidden />}
            onClick={onÅpneLeggTil}
          >
            Legg til
          </Button>
        )}
      </HStack>
      {slettFeilmelding && (
        <Alert variant="error" size="small" className="mb-3">
          {slettFeilmelding}
        </Alert>
      )}
      {hendelser.length === 0 ? (
        <BodyShort>{tomHistorikkMelding}</BodyShort>
      ) : (
        <>
          <HistorikkProsessListe
            hendelser={synligeHendelser}
            redigerbar={redigerbar}
            innloggetNavIdent={innloggetBruker.navIdent}
            onRediger={åpneRediger}
            onSlett={slettHendelse}
          />
          <Button variant="tertiary" size="small" onClick={onÅpneVisAlle} className="mt-2">
            Vis all historikk ({hendelser.length})
          </Button>
        </>
      )}
      <LeggTilHistorikkModal sakId={sakId} åpen={leggTilÅpen} onClose={onLukkLeggTil} />
      {valgtHendelse && (
        <RedigerHistorikkModal
          sakId={sakId}
          hendelse={valgtHendelse}
          åpen={redigerÅpen}
          onClose={onLukkRediger}
        />
      )}
      {visAlleÅpen && (
        <VisAllHistorikkModal
          hendelser={hendelser}
          åpen={visAlleÅpen}
          onClose={onLukkVisAlle}
          redigerbar={redigerbar}
          innloggetNavIdent={innloggetBruker.navIdent}
          onLeggTil={onÅpneLeggTil}
          onRediger={åpneRediger}
          onSlett={slettHendelse}
          slettFeilmelding={slettFeilmelding}
        />
      )}
    </Box>
  );
}
