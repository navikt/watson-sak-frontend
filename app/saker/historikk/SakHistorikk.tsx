import { PencilIcon, PlusCircleIcon, TrashIcon } from "@navikt/aksel-icons";
import { BodyShort, Box, Button, Heading, HStack, Process, VStack } from "@navikt/ds-react";
import { useState } from "react";
import { useFetcher } from "react-router";
import { useInnloggetBruker } from "~/auth/innlogget-bruker";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import { useDisclosure } from "~/utils/useDisclosure";
import {
  formaterTidspunkt,
  hendelseBeskrivelse,
  hendelseTittel,
  HendelseBullet,
  HendelseInnhold,
} from "./historikk-utils";
import { LeggTilHistorikkModal } from "./LeggTilHistorikkModal";
import { RedigerHistorikkModal } from "./RedigerHistorikkModal";
import { VisAllHistorikkModal } from "./VisAllHistorikkModal";
import type { SakHendelse } from "./typer";

interface SakHistorikkProps {
  sakId: number;
  hendelser: SakHendelse[];
}

const MAKS_SYNLIGE_HENDELSER = 5;

export function SakHistorikk({ sakId, hendelser }: SakHistorikkProps) {
  const { erÅpen: leggTilÅpen, onÅpne: onÅpneLeggTil, onLukk: onLukkLeggTil } = useDisclosure();
  const { erÅpen: visAlleÅpen, onÅpne: onÅpneVisAlle, onLukk: onLukkVisAlle } = useDisclosure();
  const { erÅpen: redigerÅpen, onÅpne: onÅpneRediger, onLukk: onLukkRediger } = useDisclosure();
  const [valgtHendelse, setValgtHendelse] = useState<SakHendelse | null>(null);
  const innloggetBruker = useInnloggetBruker();
  const fetcher = useFetcher();
  const harFlere = hendelser.length > MAKS_SYNLIGE_HENDELSER;
  const synligeHendelser = hendelser.slice(0, MAKS_SYNLIGE_HENDELSER);

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
        <Button
          variant="tertiary"
          size="small"
          icon={<PlusCircleIcon aria-hidden />}
          onClick={onÅpneLeggTil}
        >
          Legg til
        </Button>
      </HStack>
      {hendelser.length === 0 ? (
        <BodyShort>Ingen historikk for denne saken.</BodyShort>
      ) : (
        <>
          <Process>
            {synligeHendelser.map((hendelse, index) => {
              const beskrivelse = hendelseBeskrivelse(hendelse);
              const erEgetManueltNotat =
                hendelse.hendelsesType === "MANUELL_NOTAT" &&
                hendelse.opprettetAvNavIdent === innloggetBruker.navIdent;

              return (
                <Process.Event
                  key={hendelse.hendelseId}
                  title={hendelseTittel(hendelse)}
                  timestamp={formaterTidspunkt(hendelse.tidspunkt)}
                  status={index === 0 ? "active" : "completed"}
                  bullet={<HendelseBullet hendelse={hendelse} />}
                >
                  <VStack gap="space-2">
                    <HendelseInnhold hendelse={hendelse} beskrivelse={beskrivelse} />
                    {erEgetManueltNotat && (
                      <HStack gap="space-2">
                        <Button
                          variant="tertiary"
                          size="xsmall"
                          icon={<PencilIcon aria-hidden />}
                          onClick={() => åpneRediger(hendelse)}
                        >
                          Rediger
                        </Button>
                        <Button
                          variant="tertiary-neutral"
                          size="xsmall"
                          icon={<TrashIcon aria-hidden />}
                          onClick={() => slettHendelse(hendelse)}
                        >
                          Slett
                        </Button>
                      </HStack>
                    )}
                  </VStack>
                </Process.Event>
              );
            })}
          </Process>
          {harFlere && (
            <Button variant="tertiary" size="small" onClick={onÅpneVisAlle} className="mt-2">
              Vis all historikk ({hendelser.length})
            </Button>
          )}
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
          sakId={sakId}
          hendelser={hendelser}
          åpen={visAlleÅpen}
          onClose={onLukkVisAlle}
        />
      )}
    </Box>
  );
}
