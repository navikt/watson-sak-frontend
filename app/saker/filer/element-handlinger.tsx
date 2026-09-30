import { EyeIcon } from "@navikt/aksel-icons";
import { Button, Loader } from "@navikt/ds-react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { RouteConfig } from "~/routeConfig";
import { FilIBrukModal } from "./FilIBrukModal";
import { SlettFilModal } from "./SlettFilModal";
import type { DokumentNode, DokumentReferanse, FilResponse } from "./typer";

/** Åpner en PDF-versjon av et redigerbart dokument i en ny fane. */
export function DokumentPdfKnapp({ dokument, sakId }: { dokument: DokumentNode; sakId: string }) {
  const [laster, settLaster] = useState(false);
  const [feil, settFeil] = useState(false);
  const url = RouteConfig.API.PDF_FORHÅNDSVISNING.replace(":sakId", sakId).replace(
    ":docId",
    dokument.id,
  );

  async function åpnePdf() {
    settLaster(true);
    settFeil(false);
    try {
      const respons = await fetch(url, { method: "POST" });
      if (!respons.ok) throw new Error("Kunne ikke hente PDF");
      const pdfUrl = URL.createObjectURL(await respons.blob());
      const lenke = document.createElement("a");
      lenke.href = pdfUrl;
      lenke.target = "_blank";
      lenke.rel = "noopener noreferrer";
      lenke.click();
      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 1_000);
      sporHendelse("dokument lastet ned", { sakId, docId: dokument.id, format: "pdf" });
    } catch {
      settFeil(true);
    } finally {
      settLaster(false);
    }
  }

  return (
    <Button
      type="button"
      variant="tertiary-neutral"
      size="xsmall"
      icon={laster ? <Loader size="xsmall" aria-hidden /> : <EyeIcon aria-hidden />}
      aria-label={`Åpne PDF for ${dokument.tittel || "Uten tittel"}`}
      title={feil ? "Kunne ikke åpne PDF" : undefined}
      disabled={laster}
      onClick={() => void åpnePdf()}
    />
  );
}

/**
 * Sletting av opplastede filer fra en meny: viser «i bruk»-dialog hvis filen er satt inn i et
 * dokument, ellers en bekreftelsesdialog. `modaler` må rendres av kalleren.
 */
export function useFilSletting(sakId: string) {
  const fetcher = useFetcher<{ ok: boolean; dokumenter?: DokumentReferanse[] }>();
  const [iBruk, settIBruk] = useState<{ filnavn: string; dokumenter: DokumentReferanse[] } | null>(
    null,
  );
  const [kandidat, settKandidat] = useState<FilResponse | null>(null);
  const [sistSlettet, settSistSlettet] = useState<FilResponse | null>(null);

  // Backend kan avvise sletting (409) selv om filen ikke var kjent som «i bruk»
  // ved sidelasting (f.eks. hvis den ble satt inn i et dokument like før forsøket).
  useEffect(() => {
    if (
      fetcher.state === "idle" &&
      fetcher.data?.ok === false &&
      fetcher.data.dokumenter &&
      sistSlettet
    ) {
      settIBruk({ filnavn: sistSlettet.filnavn, dokumenter: fetcher.data.dokumenter });
      settSistSlettet(null);
    }
  }, [fetcher.state, fetcher.data, sistSlettet]);

  function start(fil: FilResponse) {
    if (fil.bruktIDokumenter.length > 0) {
      settIBruk({ filnavn: fil.filnavn, dokumenter: fil.bruktIDokumenter });
      return;
    }
    settKandidat(fil);
  }

  function bekreft() {
    if (!kandidat) return;
    settKandidat(null);
    settSistSlettet(kandidat);
    sporHendelse("vedlegg slettet", { sakId });
    fetcher.submit(null, {
      method: "delete",
      action: RouteConfig.API.SAK_FIL.replace(":sakId", sakId).replace(":filId", kandidat.id),
    });
  }

  const modaler = (
    <>
      <FilIBrukModal
        dokumenter={iBruk?.dokumenter ?? null}
        filnavn={iBruk?.filnavn ?? ""}
        sakId={sakId}
        onClose={() => settIBruk(null)}
      />
      {kandidat && (
        <SlettFilModal
          kandidat={kandidat.filnavn}
          sletter={fetcher.state !== "idle"}
          onBekreft={bekreft}
          onAvbryt={() => settKandidat(null)}
        />
      )}
    </>
  );

  return { start, modaler };
}
