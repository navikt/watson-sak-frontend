import { ChatIcon } from "@navikt/aksel-icons";
import { Button } from "@navikt/ds-react";
import { useCallback, useEffect, useState } from "react";

/**
 * Flytende handlingsmeny som dukker opp over en tekstmarkering i dokumentet.
 *
 * Menyen er et vanlig, fokuserbart `<button>` plassert absolutt – ikke et
 * `role="tooltip"`-triks – slik at både mus- og tastaturbrukere kan nå den.
 * Tastaturbrukere kan i tillegg bruke snarveien Cmd/Ctrl + Shift + M.
 */

type Posisjon = { topp: number; venstre: number };

export function KommentarFlytendeMeny({
  beholderRef,
  aktiv,
  onKommenter,
}: {
  beholderRef: React.RefObject<HTMLElement | null>;
  /** Slås av når dokumentet er arkivert eller brukeren mangler kommentartilgang. */
  aktiv: boolean;
  onKommenter: () => void;
}) {
  const [posisjon, settPosisjon] = useState<Posisjon | null>(null);

  const oppdater = useCallback(() => {
    const beholder = beholderRef.current;
    if (!aktiv || !beholder) {
      settPosisjon(null);
      return;
    }

    const utvalg = window.getSelection();
    if (!utvalg || utvalg.isCollapsed || utvalg.rangeCount === 0) {
      settPosisjon(null);
      return;
    }
    const range = utvalg.getRangeAt(0);
    if (!beholder.contains(range.commonAncestorContainer)) {
      settPosisjon(null);
      return;
    }
    if (range.toString().trim().length === 0) {
      settPosisjon(null);
      return;
    }

    const markering = range.getBoundingClientRect();
    const ramme = beholder.getBoundingClientRect();
    settPosisjon({
      topp: markering.top - ramme.top + beholder.scrollTop,
      venstre: markering.left - ramme.left,
    });
  }, [aktiv, beholderRef]);

  useEffect(() => {
    if (!aktiv) {
      settPosisjon(null);
      return;
    }
    document.addEventListener("selectionchange", oppdater);
    return () => document.removeEventListener("selectionchange", oppdater);
  }, [aktiv, oppdater]);

  if (!posisjon) return null;

  return (
    <div
      className="absolute z-10 -translate-y-full pb-1"
      style={{ top: posisjon.topp, left: posisjon.venstre }}
      // Hindrer at editoren mister markeringen før knappen rekker å lese den.
      onMouseDown={(event) => event.preventDefault()}
    >
      <Button
        type="button"
        size="xsmall"
        variant="primary"
        icon={<ChatIcon aria-hidden />}
        onClick={onKommenter}
      >
        Kommenter
      </Button>
    </div>
  );
}
