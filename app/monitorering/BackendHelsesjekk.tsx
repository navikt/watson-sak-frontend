import { useEffect } from "react";
import { logger } from "~/logging/logging";
import { RouteConfig } from "~/routeConfig";

const POLLING_INTERVAL_MS = 60_000;

type BackendHelsesjekkProps = {
  aktiv: boolean;
};

export function BackendHelsesjekk({ aktiv }: BackendHelsesjekkProps) {
  useEffect(() => {
    if (!aktiv) {
      return;
    }

    let erAvsluttet = false;

    async function pollBackendHelse() {
      try {
        const response = await fetch(`${RouteConfig.API.HEALTH}?backend=true`, {
          credentials: "same-origin",
        });

        if (!response.ok) {
          logger.warn("Polling av Watson Admin API sin helsesjekk feilet", {
            status: response.status,
          });
        }
      } catch (error) {
        logger.error("Klarte ikke å polle Watson Admin API sin helsesjekk", {
          error,
        });
      }
    }

    pollBackendHelse();

    const intervalId = window.setInterval(() => {
      if (erAvsluttet) {
        return;
      }

      pollBackendHelse();
    }, POLLING_INTERVAL_MS);

    return () => {
      erAvsluttet = true;
      window.clearInterval(intervalId);
    };
  }, [aktiv]);

  return null;
}
