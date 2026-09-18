import { ChatIcon } from "@navikt/aksel-icons";
import { Button } from "@navikt/ds-react";
import { useCallback, useEffect, useState } from "react";
import { elementEtikett } from "./anker";

/**
 * Handling for å kommentere et **strukturelt element** – avsnitt, overskrift,
 * listepunkt, tabellcelle, bilde eller variabel.
 *
 * Knappen ligger som ett felles overlegg i stedet for inne i hver enkelt
 * elementkomponent. Det gir én tilgjengelig implementasjon som virker for alle
 * elementtyper (også void-noder som bilde og variabel), og vi slipper å endre
 * hver Plate-komponent. Knappen vises når man holder musen over et element
 * eller når skrivemerket står i det, og den ligger i tab-rekkefølgen rett etter
 * editoren slik at tastaturbrukere når den.
 */

export type AktivtElement = {
  path: number[];
  slateType: string;
  dom: HTMLElement;
};

type Posisjon = { topp: number; venstre: number };

export function ElementKommentarHandling({
  beholderRef,
  aktivt,
  aktiv,
  onKommenter,
}: {
  beholderRef: React.RefObject<HTMLElement | null>;
  aktivt: AktivtElement | null;
  aktiv: boolean;
  onKommenter: (element: AktivtElement) => void;
}) {
  const [posisjon, settPosisjon] = useState<Posisjon | null>(null);

  const oppdater = useCallback(() => {
    const beholder = beholderRef.current;
    if (!aktiv || !aktivt || !beholder) {
      settPosisjon(null);
      return;
    }
    const element = aktivt.dom.getBoundingClientRect();
    const ramme = beholder.getBoundingClientRect();
    settPosisjon({
      topp: element.top - ramme.top + beholder.scrollTop,
      venstre: Math.max(0, element.left - ramme.left - 36),
    });
  }, [aktiv, aktivt, beholderRef]);

  useEffect(oppdater, [oppdater]);

  if (!posisjon || !aktivt) return null;

  const etikett = `Kommenter ${elementEtikett(aktivt.slateType).toLocaleLowerCase("nb-NO")}`;

  return (
    <div
      data-element-kommentar-handling
      className="absolute z-10 flex pr-[var(--ax-space-4)]"
      style={{ top: posisjon.topp, left: posisjon.venstre }}
      onMouseOver={(event) => event.stopPropagation()}
    >
      <Button
        type="button"
        size="xsmall"
        variant="tertiary"
        aria-label={etikett}
        title={etikett}
        icon={<ChatIcon aria-hidden />}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onKommenter(aktivt)}
      />
    </div>
  );
}
