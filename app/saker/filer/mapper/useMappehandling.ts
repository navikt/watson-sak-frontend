import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { erTekniskFeilSvar } from "~/feilhåndtering/Innsendingsfeil";
import { RouteConfig } from "~/routeConfig";
import type { Mappehandling, MappehandlingSvar } from "./mapper.api";

type TekniskMappefeil = { ok: false; teknisk: true; feilId: string; feil?: string };

/**
 * Sender mappehandlinger (opprett, gi nytt navn, flytt, slett) til BFF-ruten for mapper.
 * `onFullført` kalles når serveren har svart `ok`, sammen med en eventuell `vedSuksess` som ble
 * sendt med akkurat denne handlingen. Feilmeldingen fra serveren ligger i `feil`.
 * Nye handlinger ignoreres mens en handling pågår, slik at to flyttinger ikke kan fullføres i
 * feil rekkefølge. `utfør` returnerer `false` når handlingen ble ignorert.
 */
export function useMappehandling(sakId: string, onFullført?: () => void) {
  const fetcher = useFetcher<MappehandlingSvar | TekniskMappefeil>();
  const [feil, settFeil] = useState<string>();
  const [tekniskFeilSvar, settTekniskFeilSvar] = useState<TekniskMappefeil>();
  const venterPåSvar = useRef(false);
  const onFullførtRef = useRef(onFullført);
  onFullførtRef.current = onFullført;
  const vedSuksessRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    if (!venterPåSvar.current || fetcher.state !== "idle") return;
    venterPåSvar.current = false;
    const vedSuksess = vedSuksessRef.current;
    vedSuksessRef.current = undefined;
    if (fetcher.data?.ok) {
      settTekniskFeilSvar(undefined);
      vedSuksess?.();
      onFullførtRef.current?.();
    } else if (fetcher.data && erTekniskFeilSvar(fetcher.data)) {
      settFeil(undefined);
      settTekniskFeilSvar(fetcher.data);
    } else {
      settTekniskFeilSvar(undefined);
      settFeil(
        fetcher.data && !fetcher.data.ok ? fetcher.data.melding : "Kunne ikke oppdatere mappene",
      );
    }
  }, [fetcher.data, fetcher.state]);

  function utfør(handling: Mappehandling, vedSuksess?: () => void): boolean {
    if (venterPåSvar.current || fetcher.state !== "idle") return false;
    settFeil(undefined);
    settTekniskFeilSvar(undefined);
    venterPåSvar.current = true;
    vedSuksessRef.current = vedSuksess;
    fetcher.submit(handling, {
      method: "post",
      action: RouteConfig.API.SAK_MAPPER.replace(":sakId", sakId),
      encType: "application/json",
    });
    return true;
  }

  return {
    utfør,
    pågår: fetcher.state !== "idle",
    feil,
    tekniskFeilSvar,
    nullstillFeil: () => settFeil(undefined),
  };
}
