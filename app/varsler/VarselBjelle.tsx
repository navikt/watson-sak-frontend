import { BellIcon } from "@navikt/aksel-icons";
import {
  Badge,
  BodyShort,
  Button,
  Heading,
  HStack,
  InternalHeader,
  Popover,
  VStack,
} from "@navikt/ds-react";
import { useEffect, useRef, useState } from "react";
import { Link as RouterLink, useFetcher, useNavigate } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import { useVarsler, useRefreshVarsler, VARSLER_FETCHER_KEY } from "./bruk-varsler";
import type { Varsel } from "./typer";

const ANTALL_VARSLER_I_OVERLAY = 5;
const POLLING_INTERVALL_MS = 60_000;

export function VarselBjelle() {
  const varsler = useVarsler();
  const [erÅpen, setErÅpen] = useState(false);
  const knappRef = useRef<HTMLButtonElement>(null);
  const fetcher = useFetcher();
  const pollingFetcher = useFetcher<{ varsler: Varsel[] }>({ key: VARSLER_FETCHER_KEY });
  const navigate = useNavigate();
  const refreshVarsler = useRefreshVarsler();
  const prevFetcherState = useRef(fetcher.state);

  useEffect(() => {
    const intervall = setInterval(() => {
      pollingFetcher.load(RouteConfig.API.VARSLER_ULESTE);
    }, POLLING_INTERVALL_MS);
    return () => clearInterval(intervall);
    // pollingFetcher.load er stabil med key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh varsler-data etter at markering som lest er fullført
  useEffect(() => {
    if (prevFetcherState.current !== "idle" && fetcher.state === "idle") {
      refreshVarsler();
    }
    prevFetcherState.current = fetcher.state;
  }, [fetcher.state, refreshVarsler]);

  const antallUleste = varsler.filter((v) => !v.erLest).length;
  const varslerIOverlay = varsler.filter((v) => !v.erLest).slice(0, ANTALL_VARSLER_I_OVERLAY);

  function håndterVarselKlikk(varsel: Varsel) {
    setErÅpen(false);
    fetcher.submit(
      { varselId: varsel.id },
      { method: "post", action: RouteConfig.API.MARKER_VARSEL_LEST },
    );
    sporHendelse("navigere", {
      kilde: "varsel-bjelle",
      destinasjon: `/saker/${getSaksreferanse(varsel.sakId)}`,
    });
    navigate(RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(varsel.sakId)), {
      state: { tilbake: { to: RouteConfig.VARSLER, label: "Varsler" } },
    });
  }

  return (
    <>
      <InternalHeader.Button
        ref={knappRef}
        type="button"
        isActive={erÅpen}
        aria-label={antallUleste > 0 ? `Varsler, ${antallUleste} uleste` : "Varsler, ingen uleste"}
        aria-expanded={erÅpen}
        onClick={() => {
          setErÅpen((prev) => {
            if (!prev) sporHendelse("varsler åpnet", { kilde: "bjelle" });
            return !prev;
          });
        }}
      >
        {antallUleste > 0 ? (
          <Badge count={antallUleste}>
            <BellIcon fontSize="1.5rem" aria-hidden />
          </Badge>
        ) : (
          <BellIcon fontSize="1.5rem" aria-hidden />
        )}
      </InternalHeader.Button>

      <Popover
        open={erÅpen}
        onClose={() => setErÅpen(false)}
        anchorEl={knappRef.current}
        placement="bottom-end"
        arrow={false}
      >
        <Popover.Content className="w-96 p-0">
          <VStack>
            <div className="px-4 pt-4 pb-2">
              <Heading level="2" size="small">
                Varsler
              </Heading>
            </div>

            <hr className="border-ax-border-neutral-subtle" />

            {varslerIOverlay.length === 0 ? (
              <div className="px-4 py-6">
                <BodyShort className="text-ax-text-neutral-subtle text-center">
                  Du har ingen uleste varsler.
                </BodyShort>
              </div>
            ) : (
              <VStack>
                {varslerIOverlay.map((varsel) => (
                  <button
                    key={varsel.id}
                    type="button"
                    onClick={() => håndterVarselKlikk(varsel)}
                    className="text-left px-4 py-3 hover:bg-ax-bg-neutral-soft border-b border-ax-border-neutral-subtle last:border-b-0 transition-colors w-full"
                  >
                    <VStack gap="space-1">
                      <BodyShort size="small" weight="semibold">
                        {varsel.tittel}
                      </BodyShort>
                      <BodyShort size="small" className="text-ax-text-neutral-subtle line-clamp-2">
                        {varsel.tekst}
                      </BodyShort>
                    </VStack>
                  </button>
                ))}
              </VStack>
            )}

            <hr className="border-ax-border-neutral-subtle" />

            <HStack justify="center" className="px-4 py-2">
              <Button
                variant="tertiary"
                size="small"
                as={RouterLink}
                to={RouteConfig.VARSLER}
                onClick={() => {
                  setErÅpen(false);
                  sporHendelse("navigere", {
                    kilde: "varsel-bjelle",
                    destinasjon: "/varsler",
                    lenketekst: "Se alle varsler",
                  });
                }}
              >
                Se alle varsler
              </Button>
            </HStack>
          </VStack>
        </Popover.Content>
      </Popover>
    </>
  );
}
