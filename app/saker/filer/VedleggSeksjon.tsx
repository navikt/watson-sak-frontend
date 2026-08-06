import { DownloadIcon, TrashIcon } from "@navikt/aksel-icons";
import {
  Alert,
  BodyShort,
  Button,
  Detail,
  FileUpload,
  Heading,
  HStack,
  Loader,
  Table,
  VStack,
} from "@navikt/ds-react";
import type { FileObject, FileRejectedPartitioned } from "@navikt/ds-react";
import { useState } from "react";
import { useFetcher } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { RouteConfig } from "~/routeConfig";
import type { FilResponse } from "./typer";

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
}

function SlettKnapp({ filId, filnavn, sakId }: SlettKnappProps) {
  const fetcher = useFetcher();
  const sletter = fetcher.state !== "idle";
  const url = RouteConfig.API.SAK_FIL.replace(":sakId", sakId).replace(":filId", filId);

  return (
    <fetcher.Form method="delete" action={url}>
      <Button
        type="submit"
        variant="tertiary-neutral"
        size="xsmall"
        icon={sletter ? <Loader size="xsmall" aria-hidden /> : <TrashIcon aria-hidden />}
        disabled={sletter}
        aria-label={`Slett ${filnavn}`}
        onClick={() => sporHendelse("vedlegg slettet", { sakId })}
      />
    </fetcher.Form>
  );
}

interface NedlastKnappProps {
  filId: string;
  filnavn: string;
  sakId: string;
}

function NedlastKnapp({ filId, filnavn, sakId }: NedlastKnappProps) {
  const [laster, setLaster] = useState(false);
  const url = RouteConfig.API.SAK_FIL.replace(":sakId", sakId).replace(":filId", filId);

  async function håndterNedlasting() {
    setLaster(true);
    try {
      const respons = await fetch(url);
      if (!respons.ok) throw new Error("Kunne ikke hente nedlastings-URL");
      const { url: signertUrl } = (await respons.json()) as { url: string };
      sporHendelse("vedlegg lastet ned", { sakId });
      window.open(signertUrl, "_blank", "noopener,noreferrer");
    } finally {
      setLaster(false);
    }
  }

  return (
    <Button
      type="button"
      variant="tertiary-neutral"
      size="xsmall"
      icon={laster ? <Loader size="xsmall" aria-hidden /> : <DownloadIcon aria-hidden />}
      disabled={laster}
      aria-label={`Last ned ${filnavn}`}
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
  const [dropzoneKey, setDropzoneKey] = useState(0);
  const lasterOpp = opplastingFetcher.state !== "idle";
  const url = RouteConfig.API.SAK_FILER.replace(":sakId", sakId);

  function håndterFilvalg(
    _alleFiler: FileObject[],
    partitioned: { accepted: File[]; rejected: FileRejectedPartitioned[] },
  ) {
    if (partitioned.accepted.length === 0) return;

    const formData = new FormData();
    formData.append("fil", partitioned.accepted[0]);
    sporHendelse("vedlegg lastet opp", { sakId });
    opplastingFetcher.submit(formData, {
      method: "post",
      action: url,
      encType: "multipart/form-data",
    });
    setDropzoneKey((k) => k + 1);
  }

  const feilFraServer =
    opplastingFetcher.state === "idle" &&
    opplastingFetcher.data &&
    "message" in opplastingFetcher.data
      ? opplastingFetcher.data.message
      : null;

  return (
    <VStack gap="space-4">
      <Heading level="3" size="xsmall">
        Vedlegg
      </Heading>

      {kanLasteOpp && (
        <FileUpload.Dropzone
          key={dropzoneKey}
          label="Last opp fil"
          description="Dra og slipp, eller klikk for å velge fil. Filen virusskrannes automatisk."
          onSelect={håndterFilvalg}
          multiple={false}
          disabled={lasterOpp}
        />
      )}

      {feilFraServer && (
        <Alert variant="error" size="small">
          {feilFraServer}
        </Alert>
      )}

      {lasterOpp && (
        <HStack gap="space-2" align="center">
          <Loader size="small" aria-hidden />
          <BodyShort size="small" className="text-ax-text-neutral-subtle">
            Laster opp…
          </BodyShort>
        </HStack>
      )}

      {filer.length === 0 ? (
        <BodyShort size="small" className="text-ax-text-neutral-subtle">
          Ingen vedlegg ennå.
        </BodyShort>
      ) : (
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
                  <BodyShort size="small">{fil.filnavn}</BodyShort>
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
                      <SlettKnapp filId={fil.id} filnavn={fil.filnavn} sakId={sakId} />
                    )}
                  </HStack>
                </Table.DataCell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </VStack>
  );
}
