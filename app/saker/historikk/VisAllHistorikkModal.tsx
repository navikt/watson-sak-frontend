import { ClockIcon, PencilIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Modal, Process, VStack } from "@navikt/ds-react";
import { useRef, useState } from "react";
import { useInnloggetBruker } from "~/auth/innlogget-bruker";
import { useDisclosure } from "~/utils/useDisclosure";
import { RedigerHistorikkModal } from "./RedigerHistorikkModal";
import type { SakHendelse } from "./typer";
import {
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
}

export function VisAllHistorikkModal({
  sakId,
  hendelser,
  åpen,
  onClose,
}: VisAllHistorikkModalProps) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const innloggetBruker = useInnloggetBruker();
  const { erÅpen: redigerÅpen, onÅpne: onÅpneRediger, onLukk: onLukkRediger } = useDisclosure();
  const [valgtHendelse, setValgtHendelse] = useState<SakHendelse | null>(null);

  function åpneRediger(hendelse: SakHendelse) {
    setValgtHendelse(hendelse);
    onÅpneRediger();
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
          {hendelser.length === 0 ? (
            <BodyShort>Ingen historikk for denne saken.</BodyShort>
          ) : (
            <Process>
              {hendelser.map((hendelse, index) => {
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
                        <Button
                          variant="tertiary"
                          size="xsmall"
                          icon={<PencilIcon aria-hidden />}
                          onClick={() => åpneRediger(hendelse)}
                        >
                          Rediger
                        </Button>
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
    </>
  );
}
