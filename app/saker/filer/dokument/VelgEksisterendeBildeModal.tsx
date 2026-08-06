import { ImageIcon } from "@navikt/aksel-icons";
import { Alert, BodyShort, Button, Loader, Modal } from "@navikt/ds-react";
import { useEffect, useState } from "react";
import { byggBildeUrl, hentBildevedlegg } from "./bilde-opplasting";
import type { FilResponse } from "~/saker/filer/typer";

interface VelgEksisterendeBildeModalProps {
  åpen: boolean;
  sakId: string;
  onClose: () => void;
  onVelg: (fil: FilResponse) => void;
}

/**
 * Modal for å sette inn et bilde som allerede er lastet opp som vedlegg på saken,
 * uten å laste det opp på nytt. Henter listen over bildevedlegg når modalen åpnes.
 */
export function VelgEksisterendeBildeModal({
  åpen,
  sakId,
  onClose,
  onVelg,
}: VelgEksisterendeBildeModalProps) {
  const [bilder, settBilder] = useState<FilResponse[] | null>(null);
  const [feil, settFeil] = useState<string | null>(null);

  useEffect(() => {
    if (!åpen) {
      settBilder(null);
      settFeil(null);
      return;
    }

    let avbrutt = false;
    hentBildevedlegg(sakId)
      .then((funnet) => {
        if (!avbrutt) settBilder(funnet);
      })
      .catch(() => {
        if (!avbrutt) settFeil("Kunne ikke hente bildevedlegg for saken.");
      });

    return () => {
      avbrutt = true;
    };
  }, [åpen, sakId]);

  return (
    <Modal
      open={åpen}
      onClose={onClose}
      header={{ heading: "Sett inn eksisterende bilde", icon: <ImageIcon aria-hidden /> }}
      width="40rem"
    >
      <Modal.Body>
        {feil && (
          <Alert variant="error" size="small" className="mb-3">
            {feil}
          </Alert>
        )}
        {!bilder && !feil && (
          <div className="flex justify-center py-8">
            <Loader size="large" title="Henter bilder …" />
          </div>
        )}
        {bilder && bilder.length === 0 && (
          <BodyShort>Fant ingen bildevedlegg (PNG, JPEG eller WebP) på saken.</BodyShort>
        )}
        {bilder && bilder.length > 0 && (
          <div className="grid grid-cols-3 gap-[var(--ax-space-12)]">
            {bilder.map((fil) => (
              <button
                key={fil.id}
                type="button"
                className="flex flex-col gap-[var(--ax-space-4)] rounded-md border border-ax-border-neutral-subtle p-[var(--ax-space-8)] text-left hover:border-ax-border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ax-border-focus"
                onClick={() => {
                  onVelg(fil);
                  onClose();
                }}
              >
                <img
                  src={byggBildeUrl(sakId, fil.id)}
                  alt=""
                  className="h-24 w-full rounded object-cover"
                />
                <BodyShort size="small" className="truncate" title={fil.filnavn}>
                  {fil.filnavn}
                </BodyShort>
              </button>
            ))}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button type="button" variant="secondary" onClick={onClose}>
          Avbryt
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
