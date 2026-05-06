import { ArrowForwardIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Modal, Select, VStack } from "@navikt/ds-react";
import { useEffect, useState } from "react";
import { useFetcher, useNavigate } from "react-router";
import { enhetAlternativer, enhetEtiketter } from "~/registrer-sak/validering";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";

interface SendTilAnnenEnhetModalProps {
  sakId: string;
  nåværendeEnhet: string;
  åpen: boolean;
  onClose: () => void;
}

export function SendTilAnnenEnhetModal({
  sakId,
  nåværendeEnhet,
  åpen,
  onClose,
}: SendTilAnnenEnhetModalProps) {
  const fetcher = useFetcher<{ ok: boolean }>();
  const navigate = useNavigate();
  const [valgtEnhet, setValgtEnhet] = useState("");
  const saksreferanse = getSaksreferanse(sakId);
  const erSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      void navigate(RouteConfig.INDEX);
    }
  }, [fetcher.data, fetcher.state, navigate]);

  function handleClose() {
    setValgtEnhet("");
    onClose();
  }

  function handleSubmit() {
    if (!valgtEnhet || valgtEnhet === nåværendeEnhet) {
      return;
    }

    fetcher.submit(
      { handling: "send_til_annen_enhet", seksjon: valgtEnhet },
      {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", saksreferanse),
      },
    );
    handleClose();
  }

  return (
    <Modal
      open={åpen}
      onClose={handleClose}
      header={{ heading: "Send til annen enhet", icon: <ArrowForwardIcon aria-hidden /> }}
      width="small"
    >
      <Modal.Body>
        <VStack gap="space-4">
          <BodyShort>
            Velg enhet saken skal sendes til. Ansvarlig saksbehandler fristilles fra saken.
          </BodyShort>
          <Select
            label="Ny enhet"
            value={valgtEnhet}
            onChange={(event) => setValgtEnhet(event.target.value)}
          >
            <option value="">Velg enhet</option>
            {enhetAlternativer.map((enhet) => (
              <option key={enhet} value={enhet} disabled={enhet === nåværendeEnhet}>
                {enhetEtiketter[enhet]}
              </option>
            ))}
          </Select>
        </VStack>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={handleSubmit} disabled={!valgtEnhet || erSubmitting}>
          Send til annen enhet
        </Button>
        <Button variant="secondary" onClick={handleClose}>
          Avbryt
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
