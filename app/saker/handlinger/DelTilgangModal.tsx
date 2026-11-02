import { PersonGroupIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Modal, UNSAFE_Combobox, VStack } from "@navikt/ds-react";
import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { useInnloggetBruker } from "~/auth/innlogget-bruker";
import { Innsendingsfeil, erTekniskFeilSvar } from "~/feilhåndtering/Innsendingsfeil";
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
  const submitPågår = useRef(false);
  const innsendingHarStartet = useRef(false);
  const [tekniskFeil, setTekniskFeil] = useState<{ teknisk: true; feilId: string } | null>(null);
  const innloggetBruker = useInnloggetBruker();
  const saksreferanse = getSaksreferanse(sakId);
  const valgbareSaksbehandlere = saksbehandlerDetaljer.filter(
    (saksbehandler) => saksbehandler.navIdent !== innloggetBruker.navIdent,
  );
  const alternativer = valgbareSaksbehandlere.map(
    (saksbehandler) => `${saksbehandler.navn} (${saksbehandler.navIdent})`,
  );

  function finnNavIdentFraValg(valg: string) {
    return valgbareSaksbehandlere.find(
      (saksbehandler) => `${saksbehandler.navn} (${saksbehandler.navIdent})` === valg,
    )?.navIdent;
  }

  function handleClose() {
    setValgtSaksbehandler(undefined);
    setTekniskFeil(null);
    onClose();
  }

  useEffect(() => {
    if (!submitPågår.current) return;
    if (fetcher.state !== "idle") {
      innsendingHarStartet.current = true;
      return;
    }
    if (!innsendingHarStartet.current) return;

    submitPågår.current = false;
    innsendingHarStartet.current = false;
    if (fetcher.data && "ok" in fetcher.data && fetcher.data.ok) {
      setValgtSaksbehandler(undefined);
      onClose();
    } else {
      setTekniskFeil(erTekniskFeilSvar(fetcher.data) ? fetcher.data : null);
    }
  }, [fetcher.data, fetcher.state, onClose]);

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
    submitPågår.current = true;
    innsendingHarStartet.current = false;
    setTekniskFeil(null);
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
          <Innsendingsfeil svar={tekniskFeil} />
        </VStack>
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={handleDel} disabled={!valgtSaksbehandler || fetcher.state !== "idle"}>
          Del tilgang
        </Button>
        <Button variant="secondary" onClick={handleClose}>
          Avbryt
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
