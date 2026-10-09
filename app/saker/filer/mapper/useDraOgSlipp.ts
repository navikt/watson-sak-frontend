import { useEffect, useState, type DragEvent } from "react";
import { sporHendelse } from "~/analytics/analytics";
import type { FlyttbartElement } from "./MappeModaler";
import { kanFlytteMappe, mappenavn, slåSammen } from "./mappesti";
import type { useMappehandling } from "./useMappehandling";

type Slippmål = string | null;

/** Håndterer flytting av mapper og dokumenter/filer med dra og slipp i et mappetre. */
export function useDraOgSlipp({
  sakId,
  alleMapper,
  kanEndreMapper,
  mappehandling,
  settÅpen,
}: {
  sakId: string;
  alleMapper: string[];
  kanEndreMapper: boolean;
  mappehandling: ReturnType<typeof useMappehandling>;
  settÅpen: (sti: string, åpen: boolean) => void;
}) {
  const [dras, settDras] = useState<FlyttbartElement | null>(null);
  const [slippmål, settSlippmål] = useState<Slippmål | undefined>(undefined);

  // Åpner en lukket mappe når brukeren holder et element over den en liten stund.
  useEffect(() => {
    if (typeof slippmål !== "string") return;
    const tidtaker = setTimeout(() => settÅpen(slippmål, true), 700);
    return () => clearTimeout(tidtaker);
  }, [slippmål, settÅpen]);

  function kanSlippe(element: FlyttbartElement | null, mål: Slippmål): boolean {
    if (!element) return false;
    if (element.type === "mappe") {
      return (
        kanFlytteMappe(element.sti, mål) &&
        !alleMapper.includes(slåSammen(mål, mappenavn(element.sti)))
      );
    }
    return element.mappe !== mål;
  }

  function flytt(element: FlyttbartElement, mål: Slippmål) {
    if (element.type === "mappe") {
      sporHendelse("mappe flyttet", { sakId, metode: "dra og slipp" });
      mappehandling.utfør({
        handling: "endre",
        fraSti: element.sti,
        tilSti: slåSammen(mål, mappenavn(element.sti)),
      });
    } else {
      sporHendelse(element.type === "dokument" ? "dokument flyttet" : "vedlegg flyttet", {
        sakId,
        metode: "dra og slipp",
      });
      mappehandling.utfør({
        handling: element.type === "dokument" ? "flytt-dokument" : "flytt-fil",
        id: element.id,
        mappe: mål,
      });
    }
    if (mål) settÅpen(mål, true);
  }

  function avsluttDra() {
    settDras(null);
    settSlippmål(undefined);
  }

  /** Props som gjør et element flyttbart, og til et slippmål for mappen det ligger i. */
  function draProps(element: FlyttbartElement, mål: Slippmål) {
    if (!kanEndreMapper) return {};
    return {
      // Én mappehandling om gangen, så flyttinger ikke kan fullføres i feil rekkefølge.
      draggable: !mappehandling.pågår,
      onDragStart: (event: DragEvent<HTMLElement>) => {
        event.stopPropagation();
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData(
          "text/plain",
          element.type === "mappe" ? mappenavn(element.sti) : element.navn,
        );
        settDras(element);
      },
      onDragEnd: avsluttDra,
      ...slippProps(mål),
    };
  }

  function slippProps(mål: Slippmål) {
    if (!kanEndreMapper) return {};
    return {
      onDragOver: (event: DragEvent<HTMLElement>) => {
        if (!dras) return;
        event.stopPropagation();
        if (!kanSlippe(dras, mål)) {
          event.dataTransfer.dropEffect = "none";
          settSlippmål(undefined);
          return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        settSlippmål(mål);
      },
      onDrop: (event: DragEvent<HTMLElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (dras && kanSlippe(dras, mål)) flytt(dras, mål);
        avsluttDra();
      },
    };
  }

  return {
    dras,
    slippmål,
    draProps,
    slippProps,
    kanSlippe,
    fjernSlippmål: () => settSlippmål(undefined),
  };
}
