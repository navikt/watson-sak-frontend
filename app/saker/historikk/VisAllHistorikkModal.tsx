import { ClockIcon, PencilIcon, PlusCircleIcon, TrashIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, HStack, Modal, Process, ToggleGroup, VStack } from "@navikt/ds-react";
import { useMemo, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { useInnloggetBruker } from "~/auth/innlogget-bruker";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import { useDisclosure } from "~/utils/useDisclosure";
import { LeggTilHistorikkModal } from "./LeggTilHistorikkModal";
import { RedigerHistorikkModal } from "./RedigerHistorikkModal";
import type { SakHendelse } from "./typer";
import {
  erManuellHendelse,
  formaterTidspunkt,
  hendelseBeskrivelse,
  hendelseTittel,
  HendelseBullet,
  HendelseInnhold,
} from "./historikk-utils";

interface VisAllHistorikkModalProps {
  sakId: number;
  hendelser: SakHendelse[];
  åpen: boolean;
  onClose: () => void;
  redigerbar: boolean;
}

type HistorikkFilter = "ALLE" | "AUTOMATISK" | "MANUELL";

function erGyldigFilter(value: string): value is HistorikkFilter {
  return value === "ALLE" || value === "AUTOMATISK" || value === "MANUELL";
}

export function VisAllHistorikkModal({
  sakId,
  hendelser,
  åpen,
  onClose,
  redigerbar,
}: VisAllHistorikkModalProps) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const innloggetBruker = useInnloggetBruker();
  const fetcher = useFetcher();
  const { erÅpen: redigerÅpen, onÅpne: onÅpneRediger, onLukk: onLukkRediger } = useDisclosure();
  const { erÅpen: leggTilÅpen, onÅpne: onÅpneLeggTil, onLukk: onLukkLeggTil } = useDisclosure();
  const [valgtHendelse, setValgtHendelse] = useState<SakHendelse | null>(null);
  const [filter, setFilter] = useState<HistorikkFilter>("ALLE");

  const antallManuelle = useMemo(() => hendelser.filter(erManuellHendelse).length, [hendelser]);
  const antallAutomatiske = hendelser.length - antallManuelle;

  const synligeHendelser = useMemo(() => {
    if (filter === "MANUELL") return hendelser.filter(erManuellHendelse);
    if (filter === "AUTOMATISK") return hendelser.filter((h) => !erManuellHendelse(h));
    return hendelser;
  }, [hendelser, filter]);

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
    <>
      <Modal
        ref={modalRef}
        open={åpen}
        onClose={onClose}
        header={{ heading: "Historikk", icon: <ClockIcon aria-hidden /> }}
        width="48rem"
      >
        <Modal.Body>
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
                <ToggleGroup.Item value="ALLE">Alle ({hendelser.length})</ToggleGroup.Item>
                {/* @ts-expect-error - ds-react sin type for ToggleGroup.Item mangler `disabled`, selv om komponenten støtter det */}
                <ToggleGroup.Item value="AUTOMATISK" disabled={antallAutomatiske === 0}>
                  Automatiske ({antallAutomatiske})
                </ToggleGroup.Item>
                {/* @ts-expect-error - ds-react sin type for ToggleGroup.Item mangler `disabled`, selv om komponenten støtter det */}
                <ToggleGroup.Item value="MANUELL" disabled={antallManuelle === 0}>
                  Manuelle ({antallManuelle})
                </ToggleGroup.Item>
              </ToggleGroup>
            ) : (
              <div />
            )}
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
          {hendelser.length === 0 ? (
            <BodyShort>Ingen historikk for denne saken.</BodyShort>
          ) : synligeHendelser.length === 0 ? (
            <BodyShort>Ingen hendelser matcher det valgte filteret.</BodyShort>
          ) : (
            <Process className="pt-1">
              {synligeHendelser.map((hendelse) => {
                const beskrivelse = hendelseBeskrivelse(hendelse);
                const erEgetManueltNotat =
                  hendelse.hendelsesType === "MANUELL_HENDELSE" &&
                  hendelse.opprettetAvNavIdent === innloggetBruker.navIdent;

                return (
                  <Process.Event
                    key={hendelse.hendelseId}
                    title={hendelseTittel(hendelse)}
                    timestamp={formaterTidspunkt(hendelse.tidspunkt)}
                    status="completed"
                    bullet={<HendelseBullet hendelse={hendelse} />}
                  >
                    <VStack gap="space-2">
                      <HendelseInnhold hendelse={hendelse} beskrivelse={beskrivelse} />
                      {redigerbar && erEgetManueltNotat && (
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
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="secondary" onClick={onClose}>
            Lukk
          </Button>
        </Modal.Footer>
      </Modal>
      {valgtHendelse && (
        <RedigerHistorikkModal
          sakId={sakId}
          hendelse={valgtHendelse}
          åpen={redigerÅpen}
          onClose={onLukkRediger}
        />
      )}
      {redigerbar && (
        <LeggTilHistorikkModal sakId={sakId} åpen={leggTilÅpen} onClose={onLukkLeggTil} />
      )}
    </>
  );
}
