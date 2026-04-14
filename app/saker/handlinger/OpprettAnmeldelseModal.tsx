import { GavelSoundBlockIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Modal } from "@navikt/ds-react";
import { useRef } from "react";
import { useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";

interface OpprettAnmeldelseModalProps {
  sakId: string;
  åpen: boolean;
  onClose: () => void;
}

export function OpprettAnmeldelseModal({ sakId, åpen, onClose }: OpprettAnmeldelseModalProps) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const fetcher = useFetcher();

  function handleBekreft() {
    fetcher.submit(
      { handling: "loggfør_anmeldelse" },
      {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId)),
      },
    );
    onClose();
  }

  return (
    <Modal
      ref={modalRef}
      open={åpen}
      onClose={onClose}
      header={{ heading: "Opprett anmeldelse", icon: <GavelSoundBlockIcon aria-hidden /> }}
      width="small"
    >
      <Modal.Body>
        <BodyShort>
          Bekreft at du har opprettet anmeldelse, og ønsker å loggføre det.
        </BodyShort>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={handleBekreft}>
          Bekreft
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Avbryt
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
