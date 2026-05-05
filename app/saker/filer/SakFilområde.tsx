import {
  FileExcelIcon,
  FileIcon,
  FileWordIcon,
  FolderPlusIcon,
  PresentationIcon,
  UploadIcon,
} from "@navikt/aksel-icons";
import { ActionMenu, BodyShort, Button, Heading, HStack, VStack } from "@navikt/ds-react";
import { Kort } from "~/komponenter/Kort";
import { FilTre } from "./FilTre";
import type { FilNode } from "./typer";

function OpprettFilMeny({
  size,
  variant = "secondary",
}: {
  size: "small" | "xsmall";
  variant?: "secondary" | "tertiary";
}) {
  return (
    <ActionMenu>
      <ActionMenu.Trigger>
        <Button size={size} variant={variant} icon={<FileIcon aria-hidden />}>
          Opprett fil
        </Button>
      </ActionMenu.Trigger>

      <ActionMenu.Content>
        <ActionMenu.Group label="Velg filtype">
          <ActionMenu.Item icon={<FileWordIcon aria-hidden />} onClick={() => {}}>
            Word-fil
          </ActionMenu.Item>
          <ActionMenu.Item icon={<FileExcelIcon aria-hidden />} onClick={() => {}}>
            Excel-fil
          </ActionMenu.Item>
          <ActionMenu.Item icon={<PresentationIcon aria-hidden />} onClick={() => {}}>
            PowerPoint-fil
          </ActionMenu.Item>
        </ActionMenu.Group>
      </ActionMenu.Content>
    </ActionMenu>
  );
}

function TomtFilområde({ redigerbar }: { redigerbar: boolean }) {
  return (
    <VStack gap="space-8" align="center" className="py-12 bg-ax-bg-neutral-soft rounded-lg">
      <FileIcon aria-hidden className="text-ax-icon-neutral-subtle" fontSize="3rem" />
      <VStack gap="space-2" align="center">
        <BodyShort weight="semibold">Ingen filer ennå</BodyShort>
        {redigerbar && (
          <BodyShort size="small" className="text-ax-text-neutral-subtle">
            Last opp filer, opprett en fil eller opprett en mappe for å komme i gang.
          </BodyShort>
        )}
      </VStack>
      {redigerbar && (
        <HStack gap="space-4">
          <Button size="small" icon={<UploadIcon aria-hidden />} onClick={() => {}}>
            Last opp fil
          </Button>
          <OpprettFilMeny size="small" />
          <Button
            size="small"
            variant="secondary"
            icon={<FolderPlusIcon aria-hidden />}
            onClick={() => {}}
          >
            Opprett mappe
          </Button>
        </HStack>
      )}
    </VStack>
  );
}

interface SakFilområdeProps {
  filer: FilNode[];
  /** Om brukeren kan laste opp filer og opprette mapper. Standard: `true` */
  redigerbar?: boolean;
}

export function SakFilområde({ filer, redigerbar = true }: SakFilområdeProps) {
  const harFiler = filer.length > 0;

  return (
    <Kort>
      <HStack justify="space-between" align="center" className="mb-4">
        <Heading level="2" size="small">
          Filer
        </Heading>
        {harFiler && redigerbar && (
          <HStack gap="space-2">
            <Button
              size="xsmall"
              variant="tertiary"
              icon={<UploadIcon aria-hidden />}
              onClick={() => {}}
            >
              Last opp fil
            </Button>
            <OpprettFilMeny size="xsmall" variant="tertiary" />
            <Button
              size="xsmall"
              variant="tertiary"
              icon={<FolderPlusIcon aria-hidden />}
              onClick={() => {}}
            >
              Opprett mappe
            </Button>
          </HStack>
        )}
      </HStack>
      {harFiler ? <FilTre noder={filer} /> : <TomtFilområde redigerbar={redigerbar} />}
    </Kort>
  );
}
