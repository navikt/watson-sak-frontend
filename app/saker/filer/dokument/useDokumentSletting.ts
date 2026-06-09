import { useCallback, useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { RouteConfig } from "~/routeConfig";

/** Hvor slettingen ble igangsatt – brukes i analytics. */
type Slettekilde = "dokumentside" | "dokumentliste";

type Slettekandidat = { id: string; tittel: string };

type UseDokumentSlettingArgs = {
  sakId: string;
  kilde: Slettekilde;
  /** Kalles når en sletting er fullført (f.eks. for å navigere bort fra dokumentet). */
  onSlettet?: () => void;
};

/**
 * Håndterer sletting av et dokument: bekreftelsestilstand, analytics og DELETE-kallet.
 * Gjenbrukes av dokumenttreet og dokumentsiden, med ulik `kilde` og oppførsel etterpå.
 */
export function useDokumentSletting({ sakId, kilde, onSlettet }: UseDokumentSlettingArgs) {
  const [kandidat, setKandidat] = useState<Slettekandidat | null>(null);
  const fetcher = useFetcher<{ ok: true }>();
  const sletter = fetcher.state !== "idle";
  const venterPåSletting = useRef(false);

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
    venterPåSletting.current = true;
    fetcher.submit(
      { docId: kandidat.id },
      { method: "delete", action: RouteConfig.API.SAK_DOKUMENTER.replace(":sakId", sakId) },
    );
    setKandidat(null);
  }, [kandidat, sakId, kilde, fetcher]);

  const avbryt = useCallback(() => {
    if (kandidat) {
      sporHendelse("dokument sletting avbrutt", { sakId, docId: kandidat.id, kilde });
    }
    setKandidat(null);
  }, [kandidat, sakId, kilde]);

  useEffect(() => {
    if (venterPåSletting.current && fetcher.state === "idle" && fetcher.data?.ok) {
      venterPåSletting.current = false;
      onSlettet?.();
    }
  }, [fetcher.state, fetcher.data, onSlettet]);

  return { kandidat, sletter, start, bekreft, avbryt };
}
