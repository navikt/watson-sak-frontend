import { FileImageIcon, ImageIcon } from "@navikt/aksel-icons";
import { Alert, BodyShort, Button, Loader, Modal } from "@navikt/ds-react";
import { useEffect, useRef, useState } from "react";
import { TILLATTE_BILDETYPER, byggBildeUrl, hentBildevedlegg } from "./bilde-opplasting";
import type { FilResponse } from "~/saker/filer/typer";

interface SettInnBildeModalProps {
  åpen: boolean;
  sakId: string;
  lasterOpp: boolean;
  feil: string | null;
  onClose: () => void;
  onVelg: (fil: FilResponse) => void;
  onLastOpp: (filer: FileList) => void;
}

/**
 * Modal for å sette inn bilde i dokumentet – enten ved å velge et bilde som allerede er
 * lastet opp som vedlegg på saken, eller ved å laste opp et nytt. Slår sammen de to
 * tidligere separate flytene («sett inn bilde» / «sett inn eksisterende bilde») til én
 * knapp og ett sted å gjøre valget.
 */
export function SettInnBildeModal({
  åpen,
  sakId,
  lasterOpp,
  feil,
  onClose,
  onVelg,
  onLastOpp,
}: SettInnBildeModalProps) {
  const [bilder, settBilder] = useState<FilResponse[] | null>(null);
  const [hentefeil, settHentefeil] = useState<string | null>(null);
  const filInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!åpen) {
      settBilder(null);
      settHentefeil(null);
      return;
    }

    let avbrutt = false;
    hentBildevedlegg(sakId)
      .then((funnet) => {
        if (!avbrutt) settBilder(funnet);
      })
      .catch(() => {
        if (!avbrutt) settHentefeil("Kunne ikke hente bildevedlegg for saken.");
      });

    return () => {
      avbrutt = true;
    };
  }, [åpen, sakId]);

  return (
    <Modal
      open={åpen}
      onClose={onClose}
      header={{ heading: "Sett inn bilde i dokumentet", icon: <ImageIcon aria-hidden /> }}
      width="40rem"
    >
      <Modal.Body>
        <input
          ref={filInputRef}
          type="file"
          data-testid="bilde-fil-input"
          accept={TILLATTE_BILDETYPER.join(",")}
          multiple
          className="sr-only"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              onLastOpp(e.target.files);
            }
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="secondary"
          size="small"
          icon={lasterOpp ? <Loader size="xsmall" aria-hidden /> : <FileImageIcon aria-hidden />}
          disabled={lasterOpp}
          onClick={() => filInputRef.current?.click()}
          className="mb-4"
        >
          Last opp nytt bilde
        </Button>
        {feil && (
          <Alert variant="error" size="small" className="mb-3">
            {feil}
          </Alert>
        )}
        {hentefeil && (
          <Alert variant="error" size="small" className="mb-3">
            {hentefeil}
          </Alert>
        )}
        {!bilder && !hentefeil && (
          <div className="flex justify-center py-8">
            <Loader size="large" title="Henter bilder …" />
          </div>
        )}
        {bilder && bilder.length === 0 && (
          <BodyShort>
            Fant ingen tidligere opplastede bilder (PNG, JPEG eller WebP) på saken.
          </BodyShort>
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
                  loading="lazy"
                  decoding="async"
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
