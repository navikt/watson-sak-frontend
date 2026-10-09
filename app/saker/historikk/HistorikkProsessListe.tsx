import { PencilIcon, TrashIcon } from "@navikt/aksel-icons";
import { Button, HStack, Process, VStack } from "@navikt/ds-react";
import {
  formaterTidspunkt,
  hendelseBeskrivelse,
  hendelseTittel,
  grupperHistorikkHendelser,
  HendelseBullet,
  HendelseInnhold,
} from "./historikk-utils";
import type { SakHendelse } from "./typer";

interface HistorikkProsessListeProps {
  hendelser: SakHendelse[];
  redigerbar: boolean;
  onRediger: (hendelse: SakHendelse) => void;
  onSlett: (hendelse: SakHendelse) => void;
  className?: string;
  forrigeHendelseKart?: Map<string, SakHendelse>;
  hendelsesgrupper?: SakHendelse[][];
  erMigreringssak?: boolean;
}

/**
 * Rendrer historikkhendelser som en Aksel `Process`-liste, med
 * Rediger/Slett-knapper for manuelle hendelser når historikken er redigerbar.
 *
 * Delt mellom `SakHistorikk` (kompakt visning) og `VisAllHistorikkModal`
 * (full visning med filter) for å unngå duplisert rad-rendering.
 */
export function HistorikkProsessListe({
  hendelser,
  redigerbar,
  onRediger,
  onSlett,
  className,
  forrigeHendelseKart,
  hendelsesgrupper,
  erMigreringssak = false,
}: HistorikkProsessListeProps) {
  const grupper = hendelsesgrupper ?? grupperHistorikkHendelser(hendelser);

  return (
    <Process className={className}>
      {grupper.map((gruppe) => {
        const hendelse = gruppe[0];
        const forrigeHendelse = forrigeHendelseKart?.get(hendelse.hendelseId);
        const beskrivelse =
          gruppe.length > 1 ? null : hendelseBeskrivelse(hendelse, forrigeHendelse);
        const erManuellHendelse = hendelse.hendelsesType === "MANUELL_HENDELSE";

        return (
          <Process.Event
            key={hendelse.hendelseId}
            title={
              gruppe.length > 1 ? "Filer lastet opp" : hendelseTittel(hendelse, forrigeHendelse)
            }
            timestamp={formaterTidspunkt(hendelse.tidspunkt)}
            status="completed"
            bullet={<HendelseBullet hendelse={hendelse} />}
          >
            <VStack gap="space-2">
              <HendelseInnhold
                hendelse={hendelse}
                beskrivelse={beskrivelse}
                skjulAktør={erMigreringssak && hendelse.hendelsesType === "SAK_OPPRETTET"}
              />
              {redigerbar && erManuellHendelse && (
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
