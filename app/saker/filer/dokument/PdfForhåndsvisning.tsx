import { Alert, Loader } from "@navikt/ds-react";
import { useEffect, useState } from "react";
import type { DokumentInnhold } from "~/saker/filer/typer";

export function PdfForhåndsvisning({
  url,
  tittel,
  innhold,
  sistLagret,
}: {
  url: string;
  tittel: string;
  innhold: DokumentInnhold;
  sistLagret: Date | null;
}) {
  const [pdfUrl, settPdfUrl] = useState<string>();
  const [feil, settFeil] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        settFeil(undefined);
        const respons = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tittel: tittel || "Uten tittel", innhold }),
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
    }, 1_000);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [tittel, innhold, url, sistLagret]);

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
        <Loader title="Laster PDF-forhåndsvisning" size="small" />
      )}
    </section>
  );
}
