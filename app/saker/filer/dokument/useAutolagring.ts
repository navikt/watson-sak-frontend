import { useCallback, useEffect, useRef, useState } from "react";
import type { DokumentInnhold } from "~/saker/filer/typer";

export type LagreStatus = "lagret" | "endret" | "lagrer" | "feil";

export type Autolagringsdata = {
  tittel: string;
  innhold: DokumentInnhold;
};

type UseAutolagringArgs = {
  /**
   * Lagrer dataene. Skal avvise (throw) ved feil. `forlater` er `true` når lagringen
   * skjer fordi brukeren navigerer bort eller lukker fanen – da bør kallet bruke
   * `keepalive` så det rekker ut selv om siden rives ned.
   */
  lagre: (data: Autolagringsdata, opts: { forlater: boolean }) => Promise<void>;
  /** Hvor lenge vi venter etter siste endring før vi lagrer. Standard 800 ms. */
  forsinkelseMs?: number;
};

export type Autolagring = {
  status: LagreStatus;
  sistLagret: Date | null;
  /** Registrer en endring. Trigger debounced lagring. */
  registrerEndring: (data: Autolagringsdata) => void;
};

export function useAutolagring({ lagre, forsinkelseMs = 800 }: UseAutolagringArgs): Autolagring {
  const [status, setStatus] = useState<LagreStatus>("lagret");
  const [sistLagret, setSistLagret] = useState<Date | null>(null);

  // Siste endring som ennå ikke er bekreftet lagret. `null` betyr «ingenting å lagre».
  const ventende = useRef<Autolagringsdata | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lagrerNå = useRef(false);

  // Hold nyeste lagre-funksjon i en ref slik at flush ved unmount/lukking bruker den
  // nyeste uten å re-binde effekter på hver render.
  const lagreRef = useRef(lagre);
  useEffect(() => {
    lagreRef.current = lagre;
  }, [lagre]);

  const stoppTimer = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const flush = useCallback(async () => {
    stoppTimer();
    // Hvis en lagring allerede pågår, lar vi den fullføre — løkken under plukker opp
    // den nyeste endringen før den avslutter.
    if (lagrerNå.current || !ventende.current) {
      return;
    }

    lagrerNå.current = true;
    setStatus("lagrer");
    try {
      // Lagre helt til det ikke finnes nyere endringer igjen. Dette håndterer
      // tilfellet der brukeren skriver videre mens et kall er underveis.
      while (ventende.current) {
        const data: Autolagringsdata = ventende.current;
        await lagreRef.current(data, { forlater: false });
        if (ventende.current === data) {
          ventende.current = null;
          setSistLagret(new Date());
          setStatus("lagret");
        }
      }
    } catch {
      // Behold `ventende` slik at brukerens endringer ikke går tapt. Status settes til
      // «feil»; neste endring forsøker lagring på nytt.
      setStatus("feil");
    } finally {
      lagrerNå.current = false;
    }
  }, [stoppTimer]);

  const registrerEndring = useCallback(
    (data: Autolagringsdata) => {
      ventende.current = data;
      setStatus("endret");
      stoppTimer();
      timer.current = setTimeout(() => {
        void flush();
      }, forsinkelseMs);
    },
    [flush, forsinkelseMs, stoppTimer],
  );

  // Flush ved navigasjon bort fra siden (route-bytte i SPA). Kallet er «best effort»:
  // lagre-funksjonen bruker keepalive slik at det rekker ut selv om komponenten rives ned.
  // Vi hopper over dersom en lagring allerede pågår — den in-flight flush-løkken plukker
  // opp den nyeste endringen og lagrer den, så vi unngår å sende samme payload to ganger.
  useEffect(() => {
    return () => {
      stoppTimer();
      if (ventende.current && !lagrerNå.current) {
        void lagreRef.current(ventende.current, { forlater: true }).catch(() => {});
      }
    };
  }, [stoppTimer]);

  // ... og ved full sidelukking/refresh. Vi blokkerer bevisst ikke navigasjonen med en
  // «forlat siden?»-dialog: autolagringen (keepalive) tar vare på endringene.
  useEffect(() => {
    function håndterLukking() {
      if (ventende.current && !lagrerNå.current) {
        void lagreRef.current(ventende.current, { forlater: true }).catch(() => {});
      }
    }
    window.addEventListener("beforeunload", håndterLukking);
    return () => window.removeEventListener("beforeunload", håndterLukking);
  }, []);

  return { status, sistLagret, registrerEndring };
}
