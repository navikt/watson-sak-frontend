import { ArrowRightIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Modal, Tag, Textarea, VStack } from "@navikt/ds-react";
import { useRef, useState } from "react";
import { useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";
import type { SakStatus } from "~/saker/typer";
import { hentStatusVariant } from "~/saker/utils";
import { hentNesteStatus } from "./tilgjengeligeHandlinger";

interface EndreStatusModalProps {
  sakId: string;
  nåværendeStatus: SakStatus;
  åpen: boolean;
  onClose: () => void;
}

export function EndreStatusModal({ sakId, nåværendeStatus, åpen, onClose }: EndreStatusModalProps) {
  const [notat, setNotat] = useState("");
  const [feil, setFeil] = useState<string | null>(null);
  const fetcher = useFetcher();
  const modalRef = useRef<HTMLDialogElement>(null);

  const nesteStatus = hentNesteStatus(nåværendeStatus);
  const erSubmitting = fetcher.state !== "idle";

  function handleSubmit() {
    if (!notat.trim()) {
      setFeil("Du må skrive en begrunnelse for statusendringen.");
      return;
    }
    if (!nesteStatus) return;

    fetcher.submit(
      { handling: "endre_status", status: nesteStatus, notat: notat.trim() },
      {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", sakId),
      },
    );
    setNotat("");
    setFeil(null);
    onClose();
  }

  function handleClose() {
    setNotat("");
    setFeil(null);
    onClose();
  }

  if (!nesteStatus) return null;

  return (
    <Modal
      ref={modalRef}
      open={åpen}
      onClose={handleClose}
      header={{
        heading: "Endre status",
        icon: <ArrowRightIcon aria-hidden />,
      }}
      width="small"
    >
      <Modal.Body>
        <VStack gap="space-4">
          <BodyShort>
            Sak {sakId} flyttes fra{" "}
            <Tag variant={hentStatusVariant(nåværendeStatus)} size="xsmall">
              {nåværendeStatus}
            </Tag>{" "}
            til{" "}
            <Tag variant={hentStatusVariant(nesteStatus)} size="xsmall">
              {nesteStatus}
            </Tag>
            .
          </BodyShort>
          <Textarea
            label="Begrunnelse"
            description="Beskriv hvorfor statusen endres."
            value={notat}
            onChange={(e) => {
              setNotat(e.target.value);
              if (feil) setFeil(null);
            }}
            error={feil ?? undefined}
          />
        </VStack>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={handleSubmit} disabled={erSubmitting}>
          Endre status
        </Button>
        <Button variant="secondary" onClick={handleClose}>
          Avbryt
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
