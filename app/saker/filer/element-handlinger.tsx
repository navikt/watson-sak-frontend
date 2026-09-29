import { EyeIcon, PencilIcon, TrashIcon } from "@navikt/aksel-icons";
import { Button, Loader } from "@navikt/ds-react";
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { RouteConfig } from "~/routeConfig";
import { FilIBrukModal } from "./FilIBrukModal";
import { OmdøpFilModal } from "./OmdøpFilModal";
import { SlettFilModal } from "./SlettFilModal";
import type { DokumentNode, DokumentReferanse } from "./typer";

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

interface SlettKnappProps {
  filId: string;
  filnavn: string;
  sakId: string;
  bruktIDokumenter: DokumentReferanse[];
}

export function SlettFilKnapp({ filId, filnavn, sakId, bruktIDokumenter }: SlettKnappProps) {
  const fetcher = useFetcher<{ ok: boolean; dokumenter?: DokumentReferanse[] }>();
  const [dokumenterIBruk, settDokumenterIBruk] = useState<DokumentReferanse[] | null>(null);
  const [slettekandidat, settSlettekandidat] = useState<string | null>(null);
  const sletter = fetcher.state !== "idle";
  const url = RouteConfig.API.SAK_FIL.replace(":sakId", sakId).replace(":filId", filId);

  // Backend kan avvise sletting (409) selv om filen ikke var kjent som «i bruk»
  // ved sidelasting (f.eks. hvis den ble satt inn i et dokument like før forsøket).
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok === false && fetcher.data.dokumenter) {
      settDokumenterIBruk(fetcher.data.dokumenter);
    }
  }, [fetcher.state, fetcher.data]);

  function håndterKlikk(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (bruktIDokumenter.length > 0) {
      settDokumenterIBruk(bruktIDokumenter);
      return;
    }
    settSlettekandidat(filnavn);
  }

  function bekreftSletting() {
    settSlettekandidat(null);
    sporHendelse("vedlegg slettet", { sakId });
    fetcher.submit(null, { method: "delete", action: url });
  }

  return (
    <>
      <fetcher.Form method="delete" action={url}>
        <Button
          type="submit"
          variant="tertiary-neutral"
          size="xsmall"
          icon={sletter ? <Loader size="xsmall" aria-hidden /> : <TrashIcon aria-hidden />}
          disabled={sletter}
          aria-label={`Slett ${filnavn}`}
          onClick={håndterKlikk}
        />
      </fetcher.Form>
      <FilIBrukModal
        dokumenter={dokumenterIBruk}
        filnavn={filnavn}
        sakId={sakId}
        onClose={() => settDokumenterIBruk(null)}
      />
      {slettekandidat !== null && (
        <SlettFilModal
          kandidat={slettekandidat}
          sletter={sletter}
          onBekreft={bekreftSletting}
          onAvbryt={() => settSlettekandidat(null)}
        />
      )}
    </>
  );
}

export function OmdøpFilKnapp({
  filId,
  filnavn,
  sakId,
}: Omit<SlettKnappProps, "bruktIDokumenter">) {
  const [modalÅpen, setModalÅpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant="tertiary-neutral"
        size="xsmall"
        icon={<PencilIcon aria-hidden />}
        aria-label={`Endre navn på ${filnavn}`}
        onClick={() => setModalÅpen(true)}
      />
      <OmdøpFilModal
        filId={filId}
        filnavn={filnavn}
        sakId={sakId}
        åpen={modalÅpen}
        onClose={() => setModalÅpen(false)}
      />
    </>
  );
}
