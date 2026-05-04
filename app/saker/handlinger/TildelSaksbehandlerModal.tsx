import { PersonPencilIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Modal, Select, VStack } from "@navikt/ds-react";
import { useRef, useState } from "react";
import { useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import type { KontrollsakSaksbehandler } from "~/saker/types.backend";

interface TildelSaksbehandlerModalProps {
  sakId: string;
  saksbehandlere: string[];
  saksbehandlerDetaljer?: KontrollsakSaksbehandler[];
  nåværendeSaksbehandler?: KontrollsakSaksbehandler | null;
  submitPath?: string;
  åpen: boolean;
  onClose: () => void;
}

export function TildelSaksbehandlerModal({
  sakId,
  saksbehandlere,
  saksbehandlerDetaljer = [],
  nåværendeSaksbehandler,
  submitPath,
  åpen,
  onClose,
}: TildelSaksbehandlerModalProps) {
  const [valgtSaksbehandler, setValgtSaksbehandler] = useState("");
  const fetcher = useFetcher();
  const modalRef = useRef<HTMLDialogElement>(null);
  const saksreferanse = getSaksreferanse(sakId);

  const erSubmitting = fetcher.state !== "idle";
  const actionPath =
    submitPath ?? RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId));

  function handleSubmit() {
    if (!valgtSaksbehandler) return;

    fetcher.submit(
      { handling: "TILDEL", sakId, navIdent: valgtSaksbehandler },
      { method: "post", action: actionPath },
    );
    setValgtSaksbehandler("");
    onClose();
  }

  function handleFjernSaksbehandler() {
    fetcher.submit({ handling: "FRISTILL", sakId }, { method: "post", action: actionPath });
    onClose();
  }

  function handleClose() {
    setValgtSaksbehandler("");
    onClose();
  }

  const valgbareSaksbehandlere =
    saksbehandlerDetaljer.length > 0
      ? saksbehandlerDetaljer.map((saksbehandler) => ({
          verdi: saksbehandler.navIdent,
          etikett: `${saksbehandler.navn} (${saksbehandler.navIdent})`,
        }))
      : saksbehandlere.map((saksbehandler) => ({ verdi: saksbehandler, etikett: saksbehandler }));

  const heading = nåværendeSaksbehandler ? "Endre saksbehandler" : "Tildel saksbehandler";

  return (
    <Modal
      ref={modalRef}
      open={åpen}
      onClose={handleClose}
      header={{
        heading,
        icon: <PersonPencilIcon aria-hidden />,
      }}
      width="small"
    >
      <Modal.Body>
        <VStack gap="space-4">
          {nåværendeSaksbehandler && (
            <BodyShort>
              Nåværende saksbehandler:{" "}
              <strong>
                {nåværendeSaksbehandler.navn} ({nåværendeSaksbehandler.navIdent})
              </strong>
            </BodyShort>
          )}
          <BodyShort>Velg saksbehandler som skal ha ansvar for sak {saksreferanse}.</BodyShort>
          <Select
            label="Saksbehandler"
            value={valgtSaksbehandler}
            onChange={(event) => setValgtSaksbehandler(event.target.value)}
          >
            <option value="">Velg saksbehandler</option>
            {valgbareSaksbehandlere.map((saksbehandler) => (
              <option key={saksbehandler.verdi} value={saksbehandler.verdi}>
                {saksbehandler.etikett}
              </option>
            ))}
          </Select>
        </VStack>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={handleSubmit} disabled={!valgtSaksbehandler || erSubmitting}>
          Tildel
        </Button>
        <Button variant="secondary" onClick={handleClose}>
          Avbryt
        </Button>
        {nåværendeSaksbehandler && (
          <Button
            variant="tertiary-neutral"
            onClick={handleFjernSaksbehandler}
            disabled={erSubmitting}
            className="ml-auto"
          >
            Fjern saksbehandler
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}
