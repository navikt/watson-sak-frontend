import { XMarkOctagonIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Checkbox, CheckboxGroup, Modal, VStack } from "@navikt/ds-react";
import { useRef, useState } from "react";
import { useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import type { KontrollsakYtelse } from "~/saker/types.backend";

interface StansYtelseModalProps {
  sakId: string;
  ytelser: KontrollsakYtelse[];
  åpen: boolean;
  onClose: () => void;
}

export function StansYtelseModal({ sakId, ytelser, åpen, onClose }: StansYtelseModalProps) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const fetcher = useFetcher();
  const [valgteYtelseIder, setValgteYtelseIder] = useState<string[]>([]);

  function handleBekreft() {
    fetcher.submit(
      { handling: "stans_ytelse", ytelseIder: valgteYtelseIder },
      {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId)),
      },
    );
    onClose();
  }

  function handleClose() {
    setValgteYtelseIder([]);
    onClose();
  }

  const flereYtelser = ytelser.length > 1;

  return (
    <Modal
      ref={modalRef}
      open={åpen}
      onClose={handleClose}
      header={{ heading: "Stans ytelse", icon: <XMarkOctagonIcon aria-hidden /> }}
      width="small"
    >
      <Modal.Body>
        <VStack gap="space-4">
          {flereYtelser ? (
            <CheckboxGroup
              legend="Velg hvilke ytelser du vil sende stansoppgave for:"
              value={valgteYtelseIder}
              onChange={setValgteYtelseIder}
            >
              {ytelser.map((ytelse) => (
                <Checkbox key={ytelse.id} value={ytelse.id}>
                  {ytelse.type}
                </Checkbox>
              ))}
            </CheckboxGroup>
          ) : (
            <BodyShort>
              Er du sikker på at du vil sende stans-oppgave for <strong>{ytelser[0]?.type}</strong>{" "}
              i Gosys?
            </BodyShort>
          )}
          <BodyShort>Dette kan ikke angres.</BodyShort>
        </VStack>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="danger"
          onClick={handleBekreft}
          disabled={flereYtelser && valgteYtelseIder.length === 0}
        >
          Send stans-oppgave
        </Button>
        <Button variant="secondary" onClick={handleClose}>
          Avbryt
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
