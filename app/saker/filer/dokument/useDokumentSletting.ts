import { createElement, useCallback, useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { erTekniskFeilSvar, Innsendingsfeil } from "~/feilhåndtering/Innsendingsfeil";
import { RouteConfig } from "~/routeConfig";

/** Hvor slettingen ble igangsatt – brukes i analytics. */
type Slettekilde = "dokumentside" | "dokumentliste";

type Slettekandidat = { id: string; tittel: string };

type UseDokumentSlettingArgs = {
  sakId: string;
  kilde: Slettekilde;
  /**
   * Returnerer en intern URL det skal redirectes til etter at dokumentet med gitt id er
   * slettet, eller `undefined` for å bli værende. Brukes når man sletter dokumentet man
   * akkurat ser på, slik at man ikke blir stående på en død route (som ville gitt 404).
   */
  redirectTo?: (docId: string) => string | undefined;
};

/**
 * Håndterer sletting av et dokument: bekreftelsestilstand, analytics og DELETE-kallet.
 * Gjenbrukes av dokumenttreet og dokumentsiden, med ulik `kilde` og oppførsel etterpå.
 */
export function useDokumentSletting({ sakId, kilde, redirectTo }: UseDokumentSlettingArgs) {
  const [kandidat, setKandidat] = useState<Slettekandidat | null>(null);
  const fetcher = useFetcher<{ ok?: boolean; teknisk?: boolean; feilId?: string }>();
  const sletter = fetcher.state !== "idle";
  // Dokument vi venter på suksess-svar for (kun når slettingen ikke redirecter bort).
  const venterPåResultat = useRef<string | null>(null);
  const forrigeState = useRef(fetcher.state);

  const start = useCallback(
    (dokument: Slettekandidat) => {
      sporHendelse("dokument sletting påbegynt", { kilde });
      setKandidat(dokument);
    },
    [kilde],
  );

  const bekreft = useCallback(() => {
    if (!kandidat) {
      return;
    }
    const redirect = redirectTo?.(kandidat.id);
    if (redirect) {
      // Etter en vellykket sletting redirecter action-en og komponenten rives ned, så vi
      // kan ikke observere resultatet. Da sporer vi optimistisk her (navigasjon = suksess).
      sporHendelse("dokument slettet", { kilde });
    } else {
      // Ellers venter vi på at DELETE-kallet faktisk lykkes (se effekten under).
      venterPåResultat.current = kandidat.id;
    }
    fetcher.submit(
      { docId: kandidat.id, ...(redirect ? { redirectTo: redirect } : {}) },
      { method: "delete", action: RouteConfig.API.SAK_DOKUMENTER.replace(":sakId", sakId) },
    );
  }, [kandidat, sakId, kilde, redirectTo, fetcher]);

  const avbryt = useCallback(() => {
    if (kandidat) {
      sporHendelse("dokument sletting avbrutt", { kilde });
    }
    setKandidat(null);
  }, [kandidat, kilde]);

  // Dialogen lukkes og «dokument slettet» spores først når DELETE-kallet har lykkes.
  useEffect(() => {
    const varIgang = forrigeState.current !== "idle";
    forrigeState.current = fetcher.state;
    if (!varIgang || fetcher.state !== "idle" || !kandidat || !fetcher.data?.ok) return;
    if (venterPåResultat.current) {
      sporHendelse("dokument slettet", { kilde });
      venterPåResultat.current = null;
    }
    setKandidat(null);
  }, [fetcher.state, fetcher.data, kandidat, kilde]);

  const feil =
    kandidat && fetcher.state === "idle" && erTekniskFeilSvar(fetcher.data)
      ? createElement(
          Innsendingsfeil,
          { svar: fetcher.data, tittel: "Vi fikk ikke slettet dokumentet" },
          "Sjekk om dokumentet fortsatt ligger i listen før du prøver igjen.",
        )
      : undefined;

  return { kandidat, sletter, start, bekreft, avbryt, feil };
}
