import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";
import type { Mappehandling, MappehandlingSvar } from "./mapper.api";

/**
 * Sender mappehandlinger (opprett, gi nytt navn, flytt, slett) til BFF-ruten for mapper.
 * `onFullført` kalles når serveren har svart `ok`. Feilmeldingen fra serveren ligger i `feil`.
 */
export function useMappehandling(sakId: string, onFullført?: () => void) {
  const fetcher = useFetcher<MappehandlingSvar>();
  const [feil, settFeil] = useState<string>();
  const venterPåSvar = useRef(false);
  const onFullførtRef = useRef(onFullført);
  onFullførtRef.current = onFullført;

  useEffect(() => {
    if (!venterPåSvar.current || fetcher.state !== "idle") return;
    venterPåSvar.current = false;
    if (fetcher.data?.ok) {
      onFullførtRef.current?.();
    } else {
      settFeil(
        fetcher.data && !fetcher.data.ok ? fetcher.data.melding : "Kunne ikke oppdatere mappene",
      );
    }
  }, [fetcher.data, fetcher.state]);

  function utfør(handling: Mappehandling) {
    settFeil(undefined);
    venterPåSvar.current = true;
    fetcher.submit(handling, {
      method: "post",
      action: RouteConfig.API.SAK_MAPPER.replace(":sakId", sakId),
      encType: "application/json",
    });
  }

  return {
    utfør,
    pågår: fetcher.state !== "idle",
    feil,
    nullstillFeil: () => settFeil(undefined),
  };
}
