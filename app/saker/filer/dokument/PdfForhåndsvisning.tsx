import { Alert, BodyShort, Loader, VStack } from "@navikt/ds-react";
import { useEffect, useState } from "react";

/**
 * Hvor lenge vi venter etter siste endring før en ny forhåndsvisning hentes. Holder
 * antallet PDF-genereringer nede når editoren autolagrer flere ganger etter hverandre.
 */
export const FORHÅNDSVISNING_DEBOUNCE_MS = 300;

/**
 * Viser en PDF-forhåndsvisning av dokumentet. Innholdet hentes fra databasen på
 * backend-siden (dokumentets sist autolagrede innhold) — komponenten trenger derfor
 * ikke sende med tittel/innhold selv. `sistLagret` brukes kun til å vite når en ny
 * forhåndsvisning bør hentes (dvs. etter at editoren har autolagret en endring).
 */
export function PdfForhåndsvisning({ url, sistLagret }: { url: string; sistLagret: Date | null }) {
  const [pdfUrl, settPdfUrl] = useState<string>();
  const [feil, settFeil] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        settFeil(undefined);
        const respons = await fetch(url, {
          method: "POST",
          signal: controller.signal,
        });
        if (!respons.ok) throw new Error();
        const nestePdfUrl = URL.createObjectURL(await respons.blob());
        settPdfUrl((forrige) => {
          if (forrige) URL.revokeObjectURL(forrige);
          return nestePdfUrl;
        });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          settFeil("Kunne ikke oppdatere PDF-forhåndsvisningen.");
        }
      }
    }, FORHÅNDSVISNING_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [url, sistLagret]);

  useEffect(
    () => () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    },
    [pdfUrl],
  );

  return (
    <section aria-labelledby="pdf-forhåndsvisning-tittel" className="flex h-full min-h-0 flex-col">
      <h2 id="pdf-forhåndsvisning-tittel" className="sr-only">
        PDF-forhåndsvisning
      </h2>
      {feil ? (
        <Alert variant="warning" size="small">
          {feil}
        </Alert>
      ) : pdfUrl ? (
        <iframe
          title="PDF-forhåndsvisning"
          src={pdfUrl}
          className="min-h-0 w-full flex-1 border-0"
        />
      ) : (
        <VStack
          role="status"
          align="center"
          justify="center"
          gap="space-12"
          className="min-h-0 flex-1"
        >
          {/* Spinneren skjules for skjermlesere — teksten under er den tilgjengelige meldingen. */}
          <Loader aria-hidden size="xlarge" />
          <BodyShort size="small" textColor="subtle">
            Genererer forhåndsvisning…
          </BodyShort>
        </VStack>
      )}
    </section>
  );
}
