import { ClockIcon, PencilIcon, TrashIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, HStack, Modal, Process, VStack } from "@navikt/ds-react";
import { useRef, useState } from "react";
import { useFetcher } from "react-router";
import { useInnloggetBruker } from "~/auth/innlogget-bruker";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
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
  const fetcher = useFetcher();
  const { erÅpen: redigerÅpen, onÅpne: onÅpneRediger, onLukk: onLukkRediger } = useDisclosure();
  const [valgtHendelse, setValgtHendelse] = useState<SakHendelse | null>(null);

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
          {hendelser.length === 0 ? (
            <BodyShort>Ingen historikk for denne saken.</BodyShort>
          ) : (
            <Process className="pt-1">
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
    </>
  );
}
