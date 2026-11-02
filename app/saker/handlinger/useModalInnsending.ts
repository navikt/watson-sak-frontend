import { useEffect, useRef, useState } from "react";
import { erTekniskFeilSvar } from "~/feilhåndtering/Innsendingsfeil";

type FetcherMedData = { state: "idle" | "loading" | "submitting"; data?: unknown };

function hentFeilmelding(data: unknown): string | null {
  if (data && typeof data === "object" && "ok" in data && data.ok === false && "feil" in data) {
    return typeof data.feil === "string" ? data.feil : null;
  }
  return null;
}

/**
 * Holder modalen åpen til backend har svart. Avvist handling (f.eks. 409) vises i modalen,
 * og modalen lukkes først ved suksess.
 */
export function useModalInnsending(fetcher: FetcherMedData, onSuksess: () => void) {
  const venterPåSvar = useRef(false);
  const [feilmelding, setFeilmelding] = useState<string | null>(null);
  const [tekniskFeil, setTekniskFeil] = useState<{ teknisk: true; feilId: string } | null>(null);

  useEffect(() => {
    if (!venterPåSvar.current || fetcher.state !== "idle") return;
    venterPåSvar.current = false;
    const tekniskSvar = erTekniskFeilSvar(fetcher.data) ? fetcher.data : null;
    setTekniskFeil(tekniskSvar ? { teknisk: true, feilId: tekniskSvar.feilId } : null);
    const melding = tekniskSvar ? null : hentFeilmelding(fetcher.data);
    setFeilmelding(melding);
    if (!melding && !tekniskSvar) onSuksess();
  }, [fetcher.state, fetcher.data, onSuksess]);

  return {
    feilmelding,
    tekniskFeil,
    markerSendt: () => {
      venterPåSvar.current = true;
      setFeilmelding(null);
      setTekniskFeil(null);
    },
    nullstillFeil: () => {
      setFeilmelding(null);
      setTekniskFeil(null);
    },
  };
}
