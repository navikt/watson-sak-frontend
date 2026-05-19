import { PlusCircleIcon } from "@navikt/aksel-icons";
import { BodyShort, Box, Button, Heading, HStack, Process } from "@navikt/ds-react";
import { useDisclosure } from "~/utils/useDisclosure";
import {
  formaterTidspunkt,
  hendelseBeskrivelse,
  hendelseTittel,
  HendelseBullet,
  HendelseInnhold,
} from "./historikk-utils";
import { LeggTilHistorikkModal } from "./LeggTilHistorikkModal";
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
  const harFlere = hendelser.length > MAKS_SYNLIGE_HENDELSER;
  const synligeHendelser = hendelser.slice(0, MAKS_SYNLIGE_HENDELSER);

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
              return (
                <Process.Event
                  key={hendelse.hendelseId}
                  title={hendelseTittel(hendelse)}
                  timestamp={formaterTidspunkt(hendelse.tidspunkt)}
                  status={index === 0 ? "active" : "completed"}
                  bullet={<HendelseBullet hendelse={hendelse} />}
                >
                  <HendelseInnhold hendelse={hendelse} beskrivelse={beskrivelse} />
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
