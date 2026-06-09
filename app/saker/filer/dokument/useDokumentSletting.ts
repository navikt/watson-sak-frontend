import { useCallback, useState } from "react";
import { useFetcher } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
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
  const fetcher = useFetcher<{ ok: true }>();
  const sletter = fetcher.state !== "idle";

  const start = useCallback(
    (dokument: Slettekandidat) => {
      sporHendelse("dokument sletting påbegynt", { sakId, docId: dokument.id, kilde });
      setKandidat(dokument);
    },
    [sakId, kilde],
  );

  const bekreft = useCallback(() => {
    if (!kandidat) {
      return;
    }
    sporHendelse("dokument slettet", { sakId, docId: kandidat.id, kilde });

    const redirect = redirectTo?.(kandidat.id);
    fetcher.submit(
      { docId: kandidat.id, ...(redirect ? { redirectTo: redirect } : {}) },
      { method: "delete", action: RouteConfig.API.SAK_DOKUMENTER.replace(":sakId", sakId) },
    );
    setKandidat(null);
  }, [kandidat, sakId, kilde, redirectTo, fetcher]);

  const avbryt = useCallback(() => {
    if (kandidat) {
      sporHendelse("dokument sletting avbrutt", { sakId, docId: kandidat.id, kilde });
    }
    setKandidat(null);
  }, [kandidat, sakId, kilde]);

  return { kandidat, sletter, start, bekreft, avbryt };
}
