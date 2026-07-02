import { useCallback, useEffect, useRef } from "react";

const STANDARD_VARIGHET_MS = 30_000;
const SHERLOCK_CURSOR_KLASSE = "sherlock-cursor";

/**
 * Gjenbrukbar hook for et easter egg som bytter musepekeren til en
 * Sherlock-hatt i en gitt periode, eller til brukeren trykker Escape.
 *
 * `trigger()` gjør en synkron DOM-endring og returnerer med én gang – den
 * blokkerer aldri annen logikk (f.eks. et søk som skal gjennomføres normalt).
 *
 * @param varighetMs Hvor lenge pekeren skal være byttet ut (default 30 000 ms)
 * @returns En trigger-funksjon som starter effekten
 */
export function useSherlockCursor(varighetMs = STANDARD_VARIGHET_MS) {
  const tidsavbruddRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const escapeLytterRef = useRef<((event: KeyboardEvent) => void) | null>(null);

  const ryddOpp = useCallback(() => {
    clearTimeout(tidsavbruddRef.current);
    document.body.classList.remove(SHERLOCK_CURSOR_KLASSE);
    if (escapeLytterRef.current) {
      document.removeEventListener("keydown", escapeLytterRef.current);
      escapeLytterRef.current = null;
    }
  }, []);

  useEffect(() => ryddOpp, [ryddOpp]);

  return useCallback(() => {
    if (typeof window === "undefined") return;

    // Rydd opp en eventuell pågående effekt før vi starter en ny.
    ryddOpp();

    document.body.classList.add(SHERLOCK_CURSOR_KLASSE);

    const håndterEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") ryddOpp();
    };
    escapeLytterRef.current = håndterEscape;
    document.addEventListener("keydown", håndterEscape);

    tidsavbruddRef.current = setTimeout(ryddOpp, varighetMs);
  }, [varighetMs, ryddOpp]);
}
