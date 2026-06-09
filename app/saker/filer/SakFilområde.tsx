import { DocPencilIcon, FilePlusIcon, UploadIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Heading, HStack, VStack } from "@navikt/ds-react";
import { Form } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { Kort } from "~/komponenter/Kort";
import { RouteConfig } from "~/routeConfig";
import { DokumentTre } from "./DokumentTre";
import type { DokumentNode } from "./typer";

function OpprettDokumentKnapp({
  sakId,
  size,
  variant = "secondary",
}: {
  sakId: string;
  size: "small" | "xsmall";
  variant?: "secondary" | "tertiary";
}) {
  const action = RouteConfig.API.SAK_DOKUMENTER.replace(":sakId", sakId);
  return (
    <Form method="post" action={action}>
      <Button
        type="submit"
        size={size}
        variant={variant}
        icon={<FilePlusIcon aria-hidden />}
        onClick={() => sporHendelse("dokument opprettet", { sakId })}
      >
        Opprett dokument
      </Button>
    </Form>
  );
}

/** Knapp for filopplasting. Foreløpig en no-op – støtte for opplasting til GCP kommer senere. */
function LastOppFilKnapp({
  size,
  variant = "secondary",
}: {
  size: "small" | "xsmall";
  variant?: "secondary" | "tertiary";
}) {
  return (
    <Button size={size} variant={variant} icon={<UploadIcon aria-hidden />} onClick={() => {}}>
      Last opp fil
    </Button>
  );
}

function TomtDokumentområde({ sakId, redigerbar }: { sakId: string; redigerbar: boolean }) {
  return (
    <VStack gap="space-8" align="center" className="py-12 bg-ax-bg-neutral-soft rounded-lg">
      <DocPencilIcon aria-hidden className="text-ax-icon-neutral-subtle" fontSize="3rem" />
      <VStack gap="space-2" align="center">
        <BodyShort weight="semibold">Ingen dokumenter ennå</BodyShort>
        {redigerbar && (
          <BodyShort size="small" className="text-ax-text-neutral-subtle">
            Opprett et dokument eller last opp en fil for å komme i gang.
          </BodyShort>
        )}
      </VStack>
      {redigerbar && (
        <HStack gap="space-4">
          <OpprettDokumentKnapp sakId={sakId} size="small" />
          <LastOppFilKnapp size="small" variant="secondary" />
        </HStack>
      )}
    </VStack>
  );
}

interface SakFilområdeProps {
  dokumenter: DokumentNode[];
  /** Saksreferansen, brukt til å bygge lenker og opprette-handlingen. */
  sakId: string;
  /** Om brukeren kan opprette og redigere dokumenter. Standard: `true` */
  redigerbar?: boolean;
}

export function SakFilområde({ dokumenter, sakId, redigerbar = true }: SakFilområdeProps) {
  const harDokumenter = dokumenter.length > 0;

  return (
    <Kort>
      <HStack justify="space-between" align="center" className="mb-4">
        <Heading level="2" size="small">
          Dokumenter
        </Heading>
        {harDokumenter && redigerbar && (
          <HStack gap="space-2" align="center">
            <OpprettDokumentKnapp sakId={sakId} size="xsmall" variant="tertiary" />
            <LastOppFilKnapp size="xsmall" variant="tertiary" />
          </HStack>
        )}
      </HStack>
      {harDokumenter ? (
        <DokumentTre noder={dokumenter} sakId={sakId} />
      ) : (
        <TomtDokumentområde sakId={sakId} redigerbar={redigerbar} />
      )}
    </Kort>
  );
}
