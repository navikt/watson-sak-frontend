import { PassThrough } from "node:stream";

import { createReadableStreamFromReadable } from "@react-router/node";
import { isbot } from "isbot";
import type { RenderToPipeableStreamOptions } from "react-dom/server";
import { renderToPipeableStream } from "react-dom/server";
import type { EntryContext, HandleErrorFunction } from "react-router";
import { ServerRouter } from "react-router";
import { env } from "~/config/env.server";
import { loggTekniskFeil } from "~/feilhåndtering/teknisk-feil.server";
import { logger } from "~/logging/logging";
import { lagContentSecurityPolicy } from "~/sikkerhet/headers";
import { NonceProvider } from "~/sikkerhet/nonce";
import { lagNonce } from "~/sikkerhet/nonce.server";

export const streamTimeout = 60_000;

export const handleError: HandleErrorFunction = (error, { request }) => {
  if (request.signal.aborted) return;
  loggTekniskFeil(error, { kontekst: "server-rendering eller loader", request });
};

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    let userAgent = request.headers.get("user-agent");

    let readyOption: keyof RenderToPipeableStreamOptions =
      (userAgent && isbot(userAgent)) || routerContext.isSpaMode ? "onAllReady" : "onShellReady";

    // Abort the rendering stream after the `streamTimeout` so it has time to
    // flush down the rejected boundaries
    let timeoutId: ReturnType<typeof setTimeout> | undefined = setTimeout(
      () => abort(),
      streamTimeout + 1000,
    );

    // Ny nonce per forespørsel. Settes i CSP-headeren og på alle skript vi rendrer.
    const nonce = lagNonce();
    responseHeaders.set(
      "Content-Security-Policy",
      lagContentSecurityPolicy({
        nonce,
        ekstraFormActionUrls: env.WATSON_SOK_URL ? [env.WATSON_SOK_URL] : [],
      }),
    );

    const { pipe, abort } = renderToPipeableStream(
      <NonceProvider value={nonce}>
        <ServerRouter context={routerContext} url={request.url} nonce={nonce} />
      </NonceProvider>,
      {
        nonce,
        [readyOption]() {
          shellRendered = true;
          const body = new PassThrough({
            final(callback) {
              clearTimeout(timeoutId);
              timeoutId = undefined;
              callback();
            },
          });
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");

          pipe(body);

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          if (shellRendered) {
            logger.error("Error rendering shell", {
              feiltype: error instanceof Error ? error.name : typeof error,
            });
          }
        },
      },
    );
  });
}
