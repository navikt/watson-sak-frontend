import { BellIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Heading, HStack, Popover, VStack } from "@navikt/ds-react";
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

  useEffect(() => {
    const intervall = setInterval(() => {
      pollingFetcher.load(RouteConfig.API.VARSLER_ULESTE);
    }, POLLING_INTERVALL_MS);
    return () => clearInterval(intervall);
    // pollingFetcher.load er stabil med key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const antallUleste = varsler.filter((v) => !v.erLest).length;
  const varslerIOverlay = varsler.filter((v) => !v.erLest).slice(0, ANTALL_VARSLER_I_OVERLAY);

  function håndterVarselKlikk(varsel: Varsel) {
    setErÅpen(false);
    fetcher.submit(
      { varselId: varsel.id },
      { method: "post", action: RouteConfig.API.MARKER_VARSEL_LEST },
    );
    sporHendelse("navigere", { kilde: "varsel-bjelle", destinasjon: `/saker/${getSaksreferanse(varsel.sakId)}` });
    refreshVarsler();
    navigate(RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(varsel.sakId)));
  }

  return (
    <>
      <div className="relative">
        <button
          ref={knappRef}
          type="button"
          aria-label={
            antallUleste > 0 ? `Varsler, ${antallUleste} uleste` : "Varsler, ingen uleste"
          }
          aria-expanded={erÅpen}
          onClick={() => {
            setErÅpen((prev) => {
              if (!prev) sporHendelse("varsler åpnet", { kilde: "bjelle" });
              return !prev;
            });
          }}
          className="flex items-center justify-center h-full px-3 text-ax-text-on-inverted hover:bg-surface-neutral-subtle-hover transition-colors"
        >
          <BellIcon fontSize="1.5rem" aria-hidden />
        </button>
        {antallUleste > 0 && (
          <span
            aria-hidden
            className="absolute top-2 right-1 min-w-[1.1rem] h-[1.1rem] bg-surface-danger text-text-on-danger text-[0.65rem] font-bold rounded-full flex items-center justify-center px-1 pointer-events-none"
          >
            {antallUleste > 99 ? "99+" : antallUleste}
          </span>
        )}
      </div>

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
                  sporHendelse("navigere", { kilde: "varsel-bjelle", destinasjon: "/varsler", lenketekst: "Se alle varsler" });
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
