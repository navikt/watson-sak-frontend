import { PlusCircleIcon } from "@navikt/aksel-icons";
import { Alert, BodyShort, Box, Button, Heading, HStack } from "@navikt/ds-react";
import { useMemo, useState } from "react";
import { useFetcher } from "react-router";
import { erTekniskFeilSvar, Innsendingsfeil } from "~/feilhåndtering/Innsendingsfeil";
import { INNSENDINGSFEIL } from "~/feilhåndtering/feilmeldinger";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import { useDisclosure } from "~/utils/useDisclosure";
import { HistorikkProsessListe } from "./HistorikkProsessListe";
import {
  erMigreringssakMedTilbakedatertOpprettelse,
  grupperHistorikkHendelser,
  lagForrigeHendelseKart,
} from "./historikk-utils";
import { LeggTilHistorikkModal } from "./LeggTilHistorikkModal";
import { RedigerHistorikkModal } from "./RedigerHistorikkModal";
import { VisAllHistorikkModal } from "./VisAllHistorikkModal";
import type { SakHendelse } from "./typer";

interface SakHistorikkProps {
  sakId: number;
  hendelser: SakHendelse[];
  redigerbar: boolean;
  kanLeggeTil?: boolean;
}

const MAKS_SYNLIGE_HENDELSER = 5;

export function SakHistorikk({
  sakId,
  hendelser,
  redigerbar,
  kanLeggeTil = redigerbar,
}: SakHistorikkProps) {
  const { erÅpen: leggTilÅpen, onÅpne: onÅpneLeggTil, onLukk: onLukkLeggTil } = useDisclosure();
  const { erÅpen: visAlleÅpen, onÅpne: onÅpneVisAlle, onLukk: onLukkVisAlle } = useDisclosure();
  const { erÅpen: redigerÅpen, onÅpne: onÅpneRediger, onLukk: onLukkRediger } = useDisclosure();
  const [valgtHendelse, setValgtHendelse] = useState<SakHendelse | null>(null);
  const fetcher = useFetcher();
  const historikkHendelser = hendelser;
  const historikkGrupper = useMemo(
    () => grupperHistorikkHendelser(historikkHendelser),
    [historikkHendelser],
  );
  const synligeHendelsesgrupper = historikkGrupper.slice(0, MAKS_SYNLIGE_HENDELSER);
  const erMigreringssak = erMigreringssakMedTilbakedatertOpprettelse(historikkHendelser);
  const forrigeHendelseKart = useMemo(
    () => lagForrigeHendelseKart(historikkHendelser),
    [historikkHendelser],
  );
  const slettSvar = fetcher.state === "idle" ? fetcher.data : undefined;
  const slettFeilmelding =
    slettSvar && "ok" in slettSvar && !slettSvar.ok && !erTekniskFeilSvar(slettSvar)
      ? slettSvar.feil?.skjema?.[0]
      : undefined;
  // Vises både i den korte historikken og i «Vis all historikk».
  const slettFeil = erTekniskFeilSvar(slettSvar) ? (
    <Innsendingsfeil svar={slettSvar} tekster={INNSENDINGSFEIL.slettHendelse} />
  ) : slettFeilmelding ? (
    <Alert variant="error" size="small">
      {slettFeilmelding}
    </Alert>
  ) : null;

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
        {kanLeggeTil && (
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
      {slettFeil && <div className="mb-3">{slettFeil}</div>}
      {historikkGrupper.length === 0 ? (
        <BodyShort>Ingen historikk for denne saken.</BodyShort>
      ) : (
        <>
          <HistorikkProsessListe
            hendelser={historikkHendelser}
            hendelsesgrupper={synligeHendelsesgrupper}
            redigerbar={redigerbar}
            onRediger={åpneRediger}
            onSlett={slettHendelse}
            forrigeHendelseKart={forrigeHendelseKart}
            erMigreringssak={erMigreringssak}
          />
          <Button variant="tertiary" size="small" onClick={onÅpneVisAlle} className="mt-2">
            Vis all historikk ({historikkGrupper.length})
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
          hendelser={historikkHendelser}
          åpen={visAlleÅpen}
          onClose={onLukkVisAlle}
          redigerbar={redigerbar}
          kanLeggeTil={kanLeggeTil}
          onLeggTil={onÅpneLeggTil}
          onRediger={åpneRediger}
          onSlett={slettHendelse}
          slettFeil={slettFeil}
          forrigeHendelseKart={forrigeHendelseKart}
          erMigreringssak={erMigreringssak}
        />
      )}
    </Box>
  );
}
