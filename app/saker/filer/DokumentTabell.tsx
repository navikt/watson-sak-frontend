import { EyeIcon, TrashIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Detail, HStack, Link, Loader, Table } from "@navikt/ds-react";
import { useState } from "react";
import { Link as RouterLink } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { RouteConfig } from "~/routeConfig";
import { formaterDato } from "~/utils/date-utils";
import { useDokumentSletting } from "./dokument/useDokumentSletting";
import { SlettDokumentModal } from "./dokument/SlettDokumentModal";
import type { DokumentNode } from "./typer";

function DokumentPdfKnapp({ dokument, sakId }: { dokument: DokumentNode; sakId: string }) {
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

export function DokumentTabell({
  dokumenter,
  sakId,
  redigerbar,
}: {
  dokumenter: DokumentNode[];
  sakId: string;
  redigerbar: boolean;
}) {
  const sletting = useDokumentSletting({ sakId, kilde: "dokumentliste" });

  return (
    <>
      <Table size="small">
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell scope="col">Tittel</Table.HeaderCell>
            <Table.HeaderCell scope="col">Opprettet</Table.HeaderCell>
            <Table.HeaderCell scope="col">Sist endret</Table.HeaderCell>
            <Table.HeaderCell scope="col">Av</Table.HeaderCell>
            <Table.HeaderCell scope="col">
              <span className="sr-only">Handlinger</span>
            </Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {dokumenter.map((dokument) => {
            const dokumentUrl = RouteConfig.SAKER_DOKUMENT.replace(":sakId", sakId).replace(
              ":docId",
              dokument.id,
            );
            return (
              <Table.Row key={dokument.id}>
                <Table.DataCell>
                  <BodyShort size="small">
                    <Link as={RouterLink} to={dokumentUrl}>
                      {dokument.tittel || "Uten tittel"}
                    </Link>
                  </BodyShort>
                </Table.DataCell>
                <Table.DataCell>
                  <Detail>{formaterDato(dokument.opprettetDato)}</Detail>
                </Table.DataCell>
                <Table.DataCell>
                  <Detail>{formaterDato(dokument.endretDato)}</Detail>
                </Table.DataCell>
                <Table.DataCell>
                  <BodyShort size="small">{dokument.endretAv}</BodyShort>
                </Table.DataCell>
                <Table.DataCell>
                  <HStack gap="space-1" align="center">
                    <DokumentPdfKnapp dokument={dokument} sakId={sakId} />
                    {redigerbar && (
                      <Button
                        type="button"
                        variant="tertiary-neutral"
                        size="xsmall"
                        icon={<TrashIcon aria-hidden />}
                        aria-label={`Slett ${dokument.tittel || "Uten tittel"}`}
                        onClick={() => sletting.start(dokument)}
                      />
                    )}
                  </HStack>
                </Table.DataCell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table>
      <SlettDokumentModal
        kandidat={sletting.kandidat}
        sletter={sletting.sletter}
        onBekreft={sletting.bekreft}
        onAvbryt={sletting.avbryt}
      />
    </>
  );
}
