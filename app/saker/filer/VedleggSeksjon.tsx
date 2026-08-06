import { EyeIcon, LinkIcon, TrashIcon, UploadIcon } from "@navikt/aksel-icons";
import {
  Alert,
  BodyShort,
  Button,
  Detail,
  Heading,
  HStack,
  Loader,
  Table,
  Tooltip,
  VStack,
} from "@navikt/ds-react";
import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { RouteConfig } from "~/routeConfig";
import { FilIBrukModal } from "./FilIBrukModal";
import type { DokumentReferanse, FilResponse } from "./typer";

function formaterStorrelse(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formaterDatoTid(isoString: string): string {
  return new Date(isoString).toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface SlettKnappProps {
  filId: string;
  filnavn: string;
  sakId: string;
  bruktIDokumenter: DokumentReferanse[];
}

function SlettKnapp({ filId, filnavn, sakId, bruktIDokumenter }: SlettKnappProps) {
  const fetcher = useFetcher<{ ok: boolean; dokumenter?: DokumentReferanse[] }>();
  const [dokumenterIBruk, settDokumenterIBruk] = useState<DokumentReferanse[] | null>(null);
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
    if (bruktIDokumenter.length > 0) {
      event.preventDefault();
      settDokumenterIBruk(bruktIDokumenter);
      return;
    }
    sporHendelse("vedlegg slettet", { sakId });
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
        onClose={() => settDokumenterIBruk(null)}
      />
    </>
  );
}

interface NedlastKnappProps {
  filId: string;
  filnavn: string;
  sakId: string;
}

function NedlastKnapp({ filId, filnavn, sakId }: NedlastKnappProps) {
  const url = RouteConfig.API.SAK_FIL.replace(":sakId", sakId).replace(":filId", filId);

  function håndterNedlasting() {
    sporHendelse("vedlegg åpnet", { sakId });
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <Button
      type="button"
      variant="tertiary-neutral"
      size="xsmall"
      icon={<EyeIcon aria-hidden />}
      aria-label={`Åpne ${filnavn}`}
      onClick={håndterNedlasting}
    />
  );
}

interface VedleggSeksjonProps {
  filer: FilResponse[];
  sakId: string;
  erSakseier: boolean;
  kanLasteOpp: boolean;
}

export function VedleggSeksjon({ filer, sakId, erSakseier, kanLasteOpp }: VedleggSeksjonProps) {
  const opplastingFetcher = useFetcher<FilResponse | { message: string }>();
  const inputRef = useRef<HTMLInputElement>(null);
  const lasterOpp = opplastingFetcher.state !== "idle";
  const url = RouteConfig.API.SAK_FILER.replace(":sakId", sakId);

  function håndterFilvalg(event: React.ChangeEvent<HTMLInputElement>) {
    const fil = event.target.files?.[0];
    if (!fil) return;

    const formData = new FormData();
    formData.append("fil", fil);
    sporHendelse("vedlegg lastet opp", { sakId });
    opplastingFetcher.submit(formData, {
      method: "post",
      action: url,
      encType: "multipart/form-data",
    });
    // Nullstill input slik at samme fil kan lastes opp igjen
    event.target.value = "";
  }

  const feilFraServer =
    opplastingFetcher.state === "idle" &&
    opplastingFetcher.data &&
    "message" in opplastingFetcher.data
      ? opplastingFetcher.data.message
      : null;

  return (
    <VStack gap="space-4">
      <HStack justify="space-between" align="center">
        <Heading level="3" size="xsmall">
          Vedlegg
        </Heading>
        {kanLasteOpp && (
          <>
            <input
              ref={inputRef}
              type="file"
              className="sr-only"
              aria-hidden
              tabIndex={-1}
              onChange={håndterFilvalg}
            />
            <Button
              type="button"
              variant="tertiary"
              size="xsmall"
              icon={lasterOpp ? <Loader size="xsmall" aria-hidden /> : <UploadIcon aria-hidden />}
              disabled={lasterOpp}
              onClick={() => inputRef.current?.click()}
            >
              Last opp vedlegg
            </Button>
          </>
        )}
      </HStack>

      {feilFraServer && (
        <Alert variant="error" size="small">
          {feilFraServer}
        </Alert>
      )}

      <Table size="small">
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell scope="col">Filnavn</Table.HeaderCell>
            <Table.HeaderCell scope="col">Størrelse</Table.HeaderCell>
            <Table.HeaderCell scope="col">Lastet opp</Table.HeaderCell>
            <Table.HeaderCell scope="col">Av</Table.HeaderCell>
            <Table.HeaderCell scope="col">
              <span className="sr-only">Handlinger</span>
            </Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {filer.map((fil) => (
            <Table.Row key={fil.id}>
              <Table.DataCell>
                <HStack gap="space-2" align="center">
                  <BodyShort size="small">{fil.filnavn}</BodyShort>
                  {fil.bruktIDokumenter.length > 0 && (
                    <Tooltip
                      content={`I bruk i: ${fil.bruktIDokumenter.map((d) => d.tittel || "Uten tittel").join(", ")}`}
                    >
                      <LinkIcon
                        aria-label={`Filen er i bruk i ${fil.bruktIDokumenter.length} dokument(er)`}
                        className="text-ax-text-neutral-subtle"
                      />
                    </Tooltip>
                  )}
                </HStack>
              </Table.DataCell>
              <Table.DataCell>
                <Detail>{formaterStorrelse(fil.storrelse)}</Detail>
              </Table.DataCell>
              <Table.DataCell>
                <Detail>{formaterDatoTid(fil.opprettet)}</Detail>
              </Table.DataCell>
              <Table.DataCell>
                <Detail>{fil.opprettetAv}</Detail>
              </Table.DataCell>
              <Table.DataCell>
                <HStack gap="space-1" align="center">
                  <NedlastKnapp filId={fil.id} filnavn={fil.filnavn} sakId={sakId} />
                  {erSakseier && (
                    <SlettKnapp
                      filId={fil.id}
                      filnavn={fil.filnavn}
                      sakId={sakId}
                      bruktIDokumenter={fil.bruktIDokumenter}
                    />
                  )}
                </HStack>
              </Table.DataCell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </VStack>
  );
}
