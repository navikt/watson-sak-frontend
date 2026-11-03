import { ClockIcon, PlusCircleIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, HStack, Modal, ToggleGroup } from "@navikt/ds-react";
import { type ReactNode, useMemo, useRef, useState } from "react";
import { HistorikkProsessListe } from "./HistorikkProsessListe";
import {
  erMigreringssakMedTilbakedatertOpprettelse,
  erManuellHendelse,
  grupperHistorikkHendelser,
} from "./historikk-utils";
import type { SakHendelse } from "./typer";

interface VisAllHistorikkModalProps {
  hendelser: SakHendelse[];
  åpen: boolean;
  onClose: () => void;
  redigerbar: boolean;
  kanLeggeTil?: boolean;
  onLeggTil: () => void;
  onRediger: (hendelse: SakHendelse) => void;
  onSlett: (hendelse: SakHendelse) => void;
  /** Feilmelding fra siste sletting, laget av SakHistorikk. */
  slettFeil?: ReactNode;
  forrigeHendelseKart?: Map<string, SakHendelse>;
  erMigreringssak?: boolean;
}

type HistorikkFilter = "ALLE" | "AUTOMATISK" | "MANUELL";

function erGyldigFilter(value: string): value is HistorikkFilter {
  return value === "ALLE" || value === "AUTOMATISK" || value === "MANUELL";
}

/**
 * Modal som viser all historikk for en sak, med filter og mulighet for å
 * legge til/redigere/slette manuelle hendelser.
 *
 * `LeggTilHistorikkModal`/`RedigerHistorikkModal` eies og monteres av
 * forelderen (`SakHistorikk`) — denne komponenten kaller kun `onLeggTil`/
 * `onRediger`/`onSlett` for å trigge dem der. Dette sikrer at hvert skjema
 * kun finnes én gang i DOM-en, selv når "Vis all historikk" er åpen samtidig
 * som den kompakte historikkvisningen.
 */
export function VisAllHistorikkModal({
  hendelser,
  åpen,
  onClose,
  redigerbar,
  kanLeggeTil = redigerbar,
  onLeggTil,
  onRediger,
  onSlett,
  slettFeil,
  forrigeHendelseKart,
  erMigreringssak,
}: VisAllHistorikkModalProps) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const [filter, setFilter] = useState<HistorikkFilter>("ALLE");

  const erMigreringssakMedHendelser =
    erMigreringssak ?? erMigreringssakMedTilbakedatertOpprettelse(hendelser);
  const alleHendelsesgrupper = useMemo(() => grupperHistorikkHendelser(hendelser), [hendelser]);
  const antallManuelle = alleHendelsesgrupper.filter(([hendelse]) =>
    erManuellHendelse(hendelse),
  ).length;
  const antallAutomatiske = alleHendelsesgrupper.length - antallManuelle;

  const synligeHendelser = useMemo(() => {
    if (filter === "MANUELL") return hendelser.filter(erManuellHendelse);
    if (filter === "AUTOMATISK") return hendelser.filter((h) => !erManuellHendelse(h));
    return hendelser;
  }, [hendelser, filter]);
  const synligeHendelsesgrupper = useMemo(
    () => grupperHistorikkHendelser(synligeHendelser),
    [synligeHendelser],
  );

  return (
    <Modal
      ref={modalRef}
      open={åpen}
      onClose={onClose}
      header={{ heading: "Historikk", icon: <ClockIcon aria-hidden /> }}
      width="48rem"
    >
      <Modal.Body>
        {slettFeil && <div className="mb-3">{slettFeil}</div>}
        <HStack justify="space-between" align="center" className="pb-4">
          {hendelser.length > 0 ? (
            <ToggleGroup
              size="small"
              value={filter}
              onChange={(value) => {
                if (erGyldigFilter(value)) setFilter(value);
              }}
              label="Filtrer historikk"
            >
              <ToggleGroup.Item value="ALLE">Alle ({alleHendelsesgrupper.length})</ToggleGroup.Item>
              <ToggleGroup.Item value="AUTOMATISK" disabled={antallAutomatiske === 0}>
                Automatiske ({antallAutomatiske})
              </ToggleGroup.Item>
              <ToggleGroup.Item value="MANUELL" disabled={antallManuelle === 0}>
                Manuelle ({antallManuelle})
              </ToggleGroup.Item>
            </ToggleGroup>
          ) : (
            <div />
          )}
          {kanLeggeTil && (
            <Button
              variant="tertiary"
              size="small"
              icon={<PlusCircleIcon aria-hidden />}
              onClick={onLeggTil}
            >
              Legg til
            </Button>
          )}
        </HStack>
        {hendelser.length === 0 ? (
          <BodyShort>Ingen historikk for denne saken.</BodyShort>
        ) : synligeHendelsesgrupper.length === 0 ? (
          <BodyShort>Ingen hendelser matcher det valgte filteret.</BodyShort>
        ) : (
          <HistorikkProsessListe
            hendelser={synligeHendelser}
            redigerbar={redigerbar}
            onRediger={onRediger}
            onSlett={onSlett}
            className="pt-1"
            forrigeHendelseKart={forrigeHendelseKart}
            hendelsesgrupper={synligeHendelsesgrupper}
            erMigreringssak={erMigreringssakMedHendelser}
          />
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button type="button" variant="secondary" onClick={onClose}>
          Lukk
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
