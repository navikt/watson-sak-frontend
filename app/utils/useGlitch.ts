import { useCallback, useEffect, useRef } from "react";

const STANDARD_VARIGHET_MS = 400;
const RGB_SHIFT_KLASSE = "glitch-rgb-shift";
const OVERLAY_KLASSE = "glitch-overlay";

/**
 * Gjenbrukbar hook for å spille av en kortvarig, fullskjerms glitch-effekt
 * (RGB-forskyvning på sideinnholdet + et "revet" scanline-overlay). Tenkt
 * brukt til easter eggs som trigges av spesifikke brukerhandlinger.
 *
 * Effekten er rent visuell, uten lyd, og blokkerer aldri annen logikk:
 * `trigger()` gjør synkrone DOM-endringer og returnerer med én gang, slik at
 * f.eks. innsending av et skjema kan fortsette helt normalt før, under og
 * etter at effekten spilles av. Respekterer `prefers-reduced-motion`.
 *
 * @param varighetMs Hvor lenge effekten skal vises, i millisekunder
 * @returns En trigger-funksjon som starter effekten
 */
export function useGlitch(varighetMs = STANDARD_VARIGHET_MS) {
  const tidsavbruddRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return () => {
      clearTimeout(tidsavbruddRef.current);
      overlayRef.current?.remove();
    };
  }, []);

  return useCallback(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Rydd opp en eventuell pågående effekt før vi starter en ny.
    clearTimeout(tidsavbruddRef.current);
    overlayRef.current?.remove();

    document.body.classList.add(RGB_SHIFT_KLASSE);

    const overlay = document.createElement("div");
    overlay.className = OVERLAY_KLASSE;
    overlay.setAttribute("aria-hidden", "true");
    document.body.appendChild(overlay);
    overlayRef.current = overlay;

    tidsavbruddRef.current = setTimeout(() => {
      document.body.classList.remove(RGB_SHIFT_KLASSE);
      overlay.remove();
      overlayRef.current = null;
    }, varighetMs);
  }, [varighetMs]);
}
