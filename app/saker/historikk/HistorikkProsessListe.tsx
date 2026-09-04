import { PencilIcon, TrashIcon } from "@navikt/aksel-icons";
import { Button, HStack, Process, VStack } from "@navikt/ds-react";
import {
  formaterTidspunkt,
  hendelseBeskrivelse,
  hendelseTittel,
  HendelseBullet,
  HendelseInnhold,
} from "./historikk-utils";
import type { SakHendelse } from "./typer";

interface HistorikkProsessListeProps {
  hendelser: SakHendelse[];
  redigerbar: boolean;
  innloggetNavIdent: string;
  onRediger: (hendelse: SakHendelse) => void;
  onSlett: (hendelse: SakHendelse) => void;
  className?: string;
  forrigeHendelseKart?: Map<string, SakHendelse>;
}

/**
 * Rendrer historikkhendelser som en Aksel `Process`-liste, med
 * Rediger/Slett-knapper for saksbehandlerens egne manuelle hendelser.
 *
 * Delt mellom `SakHistorikk` (kompakt visning) og `VisAllHistorikkModal`
 * (full visning med filter) for å unngå at rad-rendering og eierskapssjekk
 * driver fra hverandre i to kopier.
 */
export function HistorikkProsessListe({
  hendelser,
  redigerbar,
  innloggetNavIdent,
  onRediger,
  onSlett,
  className,
  forrigeHendelseKart,
}: HistorikkProsessListeProps) {
  return (
    <Process className={className}>
      {hendelser.map((hendelse) => {
        const forrigeHendelse = forrigeHendelseKart?.get(hendelse.hendelseId);
        const beskrivelse = hendelseBeskrivelse(hendelse, forrigeHendelse);
        const erEgenManuellHendelse =
          hendelse.hendelsesType === "MANUELL_HENDELSE" &&
          hendelse.opprettetAvNavIdent === innloggetNavIdent;

        return (
          <Process.Event
            key={hendelse.hendelseId}
            title={hendelseTittel(hendelse, forrigeHendelse)}
            timestamp={formaterTidspunkt(hendelse.tidspunkt)}
            status="completed"
            bullet={<HendelseBullet hendelse={hendelse} />}
          >
            <VStack gap="space-2">
              <HendelseInnhold hendelse={hendelse} beskrivelse={beskrivelse} />
              {redigerbar && erEgenManuellHendelse && (
                <HStack gap="space-2">
                  <Button
                    variant="tertiary"
                    size="xsmall"
                    icon={<PencilIcon aria-hidden />}
                    onClick={() => onRediger(hendelse)}
                  >
                    Rediger
                  </Button>
                  <Button
                    variant="tertiary-neutral"
                    size="xsmall"
                    icon={<TrashIcon aria-hidden />}
                    onClick={() => onSlett(hendelse)}
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
  );
}
