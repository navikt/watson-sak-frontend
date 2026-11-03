import { createElement, useCallback, useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { INNSENDINGSFEIL } from "~/feilhåndtering/feilmeldinger";
import {
  erTekniskFeilSvar,
  Innsendingsfeil,
  type TekniskFeil,
  tekniskFeilFra,
} from "~/feilhåndtering/Innsendingsfeil";
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
  // Feil-ID fra svaret på denne dialogens innsending. Egen state, så en feil fra et tidligere
  // dokument ikke vises når dialogen åpnes for et nytt.
  const [tekniskFeil, setTekniskFeil] = useState<TekniskFeil | null>(null);

  const start = useCallback(
    (dokument: Slettekandidat) => {
      sporHendelse("dokument sletting påbegynt", { kilde });
      setTekniskFeil(null);
      setKandidat(dokument);
    },
    [kilde],
  );

  const bekreft = useCallback(() => {
    if (!kandidat) {
      return;
    }
    setTekniskFeil(null);
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
    // Ikke lukk mens slettingen pågår. Da kunne svaret høre til et annet dokument
    // enn det dialogen er åpen for. Gjelder også kryss og Escape, ikke bare Avbryt-knappen.
    if (sletter) return;
    if (kandidat) {
      sporHendelse("dokument sletting avbrutt", { kilde });
    }
    setTekniskFeil(null);
    setKandidat(null);
  }, [kandidat, kilde, sletter]);

  // Dialogen lukkes og «dokument slettet» spores først når DELETE-kallet har lykkes.
  useEffect(() => {
    const varIgang = forrigeState.current !== "idle";
    forrigeState.current = fetcher.state;
    if (!varIgang || fetcher.state !== "idle" || !kandidat) return;
    if (erTekniskFeilSvar(fetcher.data)) {
      setTekniskFeil(tekniskFeilFra(fetcher.data));
      return;
    }
    if (!fetcher.data?.ok) return;
    if (venterPåResultat.current) {
      sporHendelse("dokument slettet", { kilde });
      venterPåResultat.current = null;
    }
    setKandidat(null);
  }, [fetcher.state, fetcher.data, kandidat, kilde]);

  const feil =
    kandidat && tekniskFeil
      ? createElement(Innsendingsfeil, {
          svar: tekniskFeil,
          tekster: INNSENDINGSFEIL.slettDokument,
        })
      : undefined;

  return { kandidat, sletter, start, bekreft, avbryt, feil };
}
