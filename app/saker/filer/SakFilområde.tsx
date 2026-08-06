import { DocPencilIcon, FilePlusIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Heading, HStack, VStack } from "@navikt/ds-react";
import { Form } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { Kort } from "~/komponenter/Kort";
import { RouteConfig } from "~/routeConfig";
import { DokumentTre } from "./DokumentTre";
import type { DokumentNode, FilResponse } from "./typer";
import { VedleggSeksjon } from "./VedleggSeksjon";

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

function TomtDokumentområde({ sakId, redigerbar }: { sakId: string; redigerbar: boolean }) {
  return (
    <VStack gap="space-8" align="center" className="py-12 bg-ax-bg-neutral-soft rounded-lg">
      <DocPencilIcon aria-hidden className="text-ax-icon-neutral-subtle" fontSize="3rem" />
      <VStack gap="space-2" align="center">
        <BodyShort weight="semibold">Ingen dokumenter ennå</BodyShort>
        {redigerbar && (
          <BodyShort size="small" className="text-ax-text-neutral-subtle">
            Opprett et dokument for å komme i gang.
          </BodyShort>
        )}
      </VStack>
      {redigerbar && (
        <HStack gap="space-4">
          <OpprettDokumentKnapp sakId={sakId} size="small" />
        </HStack>
      )}
    </VStack>
  );
}

interface SakFilområdeProps {
  dokumenter: DokumentNode[];
  filer: FilResponse[];
  /** Saksreferansen, brukt til å bygge lenker og opprette-handlingen. */
  sakId: string;
  /** Om brukeren kan opprette og redigere dokumenter. Standard: `true` */
  redigerbar?: boolean;
  /** Om innlogget bruker er sakseier og kan slette vedlegg. Standard: `false` */
  erSakseier?: boolean;
}

export function SakFilområde({
  dokumenter,
  filer,
  sakId,
  redigerbar = true,
  erSakseier = false,
}: SakFilområdeProps) {
  const harDokumenter = dokumenter.length > 0;

  return (
    <Kort>
      <VStack gap="space-8">
        <div>
          <HStack justify="space-between" align="center" className="mb-4">
            <Heading level="2" size="small">
              Dokumenter
            </Heading>
            {harDokumenter && redigerbar && (
              <OpprettDokumentKnapp sakId={sakId} size="xsmall" variant="tertiary" />
            )}
          </HStack>
          {harDokumenter ? (
            <DokumentTre noder={dokumenter} sakId={sakId} redigerbar={redigerbar} />
          ) : (
            <TomtDokumentområde sakId={sakId} redigerbar={redigerbar} />
          )}
        </div>

        <div className="border-t border-ax-border-neutral-subtle pt-6">
          <VedleggSeksjon
            filer={filer}
            sakId={sakId}
            erSakseier={erSakseier}
            kanLasteOpp={redigerbar}
          />
        </div>
      </VStack>
    </Kort>
  );
}
