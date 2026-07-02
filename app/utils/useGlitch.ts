import { useCallback, useEffect, useRef } from "react";

const STANDARD_FORSINKELSE_MS = 500;
const STANDARD_VARIGHET_MS = 900;
const RGB_SHIFT_KLASSE = "glitch-rgb-shift";
const OVERLAY_KLASSE = "glitch-overlay";

type GlitchOpts = {
  /** Ventetid før effekten starter, i millisekunder. */
  forsinkelseMs?: number;
  /** Hvor lenge selve effekten varer, i millisekunder. */
  varighetMs?: number;
};

/**
 * Gjenbrukbar hook for å spille av en kortvarig, fullskjerms glitch-effekt
 * (RGB-forskyvning på sideinnholdet + et "revet" scanline-overlay). Tenkt
 * brukt til easter eggs som trigges av spesifikke brukerhandlinger.
 *
 * Effekten er rent visuell, uten lyd, og blokkerer aldri annen logikk:
 * `trigger()` gjør synkrone DOM-endringer og returnerer med én gang, slik at
 * f.eks. innsending av et skjema kan fortsette helt normalt før, under og
 * etter at effekten spilles av (inkludert i ventetiden før den starter).
 * Respekterer `prefers-reduced-motion`.
 *
 * @param opts.forsinkelseMs Ventetid før effekten starter (default 500 ms)
 * @param opts.varighetMs Hvor lenge effekten varer (default 900 ms)
 * @returns En trigger-funksjon som starter effekten
 */
export function useGlitch({
  forsinkelseMs = STANDARD_FORSINKELSE_MS,
  varighetMs = STANDARD_VARIGHET_MS,
}: GlitchOpts = {}) {
  const forsinkelseRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const varighetRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const ryddOpp = useCallback(() => {
    clearTimeout(forsinkelseRef.current);
    clearTimeout(varighetRef.current);
    document.body.classList.remove(RGB_SHIFT_KLASSE);
    document.body.style.removeProperty("animation-duration");
    overlayRef.current?.remove();
    overlayRef.current = null;
  }, []);

  useEffect(() => ryddOpp, [ryddOpp]);

  return useCallback(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Rydd opp en eventuell pågående effekt før vi starter en ny.
    ryddOpp();

    forsinkelseRef.current = setTimeout(() => {
      document.body.style.setProperty("animation-duration", `${varighetMs}ms`);
      document.body.classList.add(RGB_SHIFT_KLASSE);

      const overlay = document.createElement("div");
      overlay.className = OVERLAY_KLASSE;
      overlay.style.animationDuration = `${varighetMs}ms`;
      overlay.setAttribute("aria-hidden", "true");
      document.body.appendChild(overlay);
      overlayRef.current = overlay;

      varighetRef.current = setTimeout(() => {
        document.body.classList.remove(RGB_SHIFT_KLASSE);
        document.body.style.removeProperty("animation-duration");
        overlay.remove();
        overlayRef.current = null;
      }, varighetMs);
    }, forsinkelseMs);
  }, [forsinkelseMs, varighetMs, ryddOpp]);
}
