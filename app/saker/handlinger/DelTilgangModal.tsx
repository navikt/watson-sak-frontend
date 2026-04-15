import { PersonGroupIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Modal, UNSAFE_Combobox, VStack } from "@navikt/ds-react";
import { useRef, useState } from "react";
import { useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import type { KontrollsakSaksbehandler } from "~/saker/types.backend";

interface DelTilgangModalProps {
  sakId: string;
  saksbehandlerDetaljer: KontrollsakSaksbehandler[];
  åpen: boolean;
  onClose: () => void;
}

export function DelTilgangModal({
  sakId,
  saksbehandlerDetaljer,
  åpen,
  onClose,
}: DelTilgangModalProps) {
  const [valgtSaksbehandler, setValgtSaksbehandler] = useState<string | undefined>(undefined);
  const modalRef = useRef<HTMLDialogElement>(null);
  const fetcher = useFetcher();
  const saksreferanse = getSaksreferanse(sakId);
  const alternativer = saksbehandlerDetaljer.map(
    (saksbehandler) => `${saksbehandler.navn} (${saksbehandler.navIdent})`,
  );

  function finnNavIdentFraValg(valg: string) {
    return saksbehandlerDetaljer.find(
      (saksbehandler) => `${saksbehandler.navn} (${saksbehandler.navIdent})` === valg,
    )?.navIdent;
  }

  function handleClose() {
    setValgtSaksbehandler(undefined);
    onClose();
  }

  function handleDel() {
    const navIdent = valgtSaksbehandler ? finnNavIdentFraValg(valgtSaksbehandler) : undefined;

    if (!navIdent) return;

    fetcher.submit(
      { handling: "del_tilgang", navIdent },
      {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", saksreferanse),
      },
    );
    handleClose();
  }

  return (
    <Modal
      ref={modalRef}
      open={åpen}
      onClose={handleClose}
      header={{ heading: "Del tilgang", icon: <PersonGroupIcon aria-hidden /> }}
      width="small"
    >
      <Modal.Body>
        <VStack gap="space-4">
          <BodyShort>Velg saksbehandler som skal få tilgang til sak {saksreferanse}.</BodyShort>
          <UNSAFE_Combobox
            label="Saksbehandler"
            options={alternativer}
            selectedOptions={valgtSaksbehandler ? [valgtSaksbehandler] : []}
            onToggleSelected={(option, isSelected) => {
              setValgtSaksbehandler(isSelected ? option : undefined);
            }}
          />
        </VStack>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={handleDel} disabled={!valgtSaksbehandler}>
          Del tilgang
        </Button>
        <Button variant="secondary" onClick={handleClose}>
          Avbryt
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
