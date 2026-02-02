import { BellIcon } from "@navikt/aksel-icons";
import { BodyLong, Button } from "@navikt/ds-react";
import { Modal, ModalBody, ModalFooter } from "@navikt/ds-react/Modal";
import { useEffect, useRef, useState } from "react";
import { sporHendelse } from "~/analytics/analytics";
import { logger } from "~/logging/logging";
import { RouteConfig } from "~/routeConfig";

const POLLING_INTERVAL_MS = 60_000;

type VersjonsvarslingProps = {
  gjeldendeVersjon?: string;
};

type VersjonRespons = {
  appversjon: string;
};

/**
 * Viser en modal som sjekker og informerer brukeren når en nyere versjon av appen er tilgjengelig.
 *
 * @param gjeldendeVersjon - Versjonsnummeret som er aktivt i klienten akkurat nå.
 *
 * @example
 * <Versjonsvarsling gjeldendeVersjon={envs.appversjon} />
 */
export function Versjonsvarsling({ gjeldendeVersjon }: VersjonsvarslingProps) {
  const [skalVises, setSkalVises] = useState(false);
  const timeoutId = useRef<number | undefined>(undefined);
  const aktivController = useRef<AbortController | undefined>(undefined);

  useEffect(() => {
    if (!gjeldendeVersjon) {
      return;
    }

    let erAvsluttet = false;

    function avbrytPågåendeKall() {
      aktivController.current?.abort();
      aktivController.current = undefined;
    }

    async function sjekkEtterNyVersjon() {
      if (!erSynligDokument()) {
        planleggNySjekk();
        return;
      }

      avbrytPågåendeKall();
      aktivController.current = new AbortController();

      try {
        const serverVersjon = await hentVersjonFraServer(
          aktivController.current.signal,
        );

        if (serverVersjon && serverVersjon !== gjeldendeVersjon) {
          setSkalVises(true);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          logger.error("Klarte ikke å hente appversjon", { error });
        }
      } finally {
        planleggNySjekk();
      }
    }

    function planleggNySjekk() {
      if (erAvsluttet) {
        return;
      }

      if (timeoutId.current) {
        window.clearTimeout(timeoutId.current);
      }

      timeoutId.current = window.setTimeout(() => {
        sjekkEtterNyVersjon();
      }, POLLING_INTERVAL_MS);
    }

    planleggNySjekk();

    return () => {
      erAvsluttet = true;
      if (timeoutId.current) {
        window.clearTimeout(timeoutId.current);
      }
      avbrytPågåendeKall();
    };
  }, [gjeldendeVersjon]);

  if (!skalVises) {
    return null;
  }

  return (
    <Modal
      open={skalVises}
      onClose={() => {}}
      header={{
        heading: "Watson Søk har blitt oppdatert",
        icon: <BellIcon aria-hidden={true} />,
        closeButton: false,
      }}
      closeOnBackdropClick={false}
      width="small"
    >
      <ModalBody>
        <BodyLong>
          Det har kommet en ny versjon av Watson Søk. For å fortsette å bruke
          løsningen, må du laste inn siden på nytt.
        </BodyLong>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={() => {
            sporHendelse("side lastet på nytt grunnet ny versjon");
            window.location.reload();
          }}
        >
          Last inn siden på nytt
        </Button>
      </ModalFooter>
    </Modal>
  );
}

/**
 * Fetcher versjon fra API-et og returnerer den som en streng.
 *
 * @param signal - Abort-signal slik at vi kan stoppe fetch ved av-mount
 * @returns Versjonsnummer dersom serveren svarer
 *
 * @example
 * const versjon = await hentVersjonFraServer();
 * console.log(versjon);
 */
async function hentVersjonFraServer(signal?: AbortSignal) {
  const respons = await fetch(RouteConfig.API.VERSION, {
    method: "GET",
    credentials: "same-origin",
    signal,
  });

  if (!respons.ok) {
    throw new Error("Versjonsendepunkt feilet");
  }

  const data = (await respons.json()) as VersjonRespons;
  return data.appversjon;
}

/**
 * Sjekker om dokumentet er synlig og dermed om det er fornuftig å gjøre polling.
 *
 * @returns True dersom fanen er synlig, ellers false
 */
function erSynligDokument() {
  if (typeof document === "undefined") {
    return true;
  }

  return document.visibilityState === "visible";
}
