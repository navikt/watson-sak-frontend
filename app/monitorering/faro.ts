import {
  getWebInstrumentations,
  initializeFaro,
  LogLevel,
  ReactIntegration,
  ReactRouterVersion,
  type Faro,
} from "@grafana/faro-react";
import { useEffect } from "react";
import { matchRoutes, unstable_useRoute } from "react-router";
import { fjernPersondata } from "./faro-persondata";

export function useFaro() {
  const { loaderData } = unstable_useRoute("root");
  const isProd = loaderData?.envs.isProd;
  const faroUrl = loaderData?.envs.faroUrl;
  useEffect(() => {
    if (isProd && faroUrl) {
      initFaro(faroUrl);
    } else {
      console.log("Faro er avslått lokalt");
    }
  }, [isProd, faroUrl]);
}

let faro: Faro | null = null;

function initFaro(url: string) {
  if (typeof document === "undefined" || faro !== null) {
    return;
  }

  faro = initializeFaro({
    url,
    app: {
      name: "watson-sak",
    },
    beforeSend: fjernPersondata,
    consoleInstrumentation: {
      disabledLevels: [LogLevel.DEBUG, LogLevel.TRACE, LogLevel.LOG, LogLevel.INFO],
    },
    sessionTracking: {
      enabled: true,
      persistent: true,
    },
    instrumentations: [
      ...getWebInstrumentations({
        captureConsole: true,
      }),
      new ReactIntegration({
        router: {
          version: ReactRouterVersion.V7_data_router,
          dependencies: {
            matchRoutes,
          },
        },
      }),
    ],
  });
}
