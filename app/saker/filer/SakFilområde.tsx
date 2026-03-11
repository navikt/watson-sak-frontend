import { FileIcon, FolderPlusIcon, UploadIcon } from "@navikt/aksel-icons";
import { BodyShort, Box, Button, Heading, HStack, VStack } from "@navikt/ds-react";
import { FilTre } from "./FilTre";
import type { FilNode } from "./typer";

function TomtFilområde() {
  return (
    <VStack gap="space-4" align="center" className="py-8">
      <FileIcon aria-hidden className="text-ax-icon-neutral-subtle" fontSize="3rem" />
      <VStack gap="space-1" align="center">
        <BodyShort weight="semibold">Ingen filer ennå</BodyShort>
        <BodyShort size="small" className="text-ax-text-neutral-subtle">
          Last opp filer eller opprett en mappe for å komme i gang.
        </BodyShort>
      </VStack>
      <HStack gap="space-2">
        <Button size="small" icon={<UploadIcon aria-hidden />} onClick={() => {}}>
          Last opp fil
        </Button>
        <Button
          size="small"
          variant="secondary"
          icon={<FolderPlusIcon aria-hidden />}
          onClick={() => {}}
        >
          Opprett mappe
        </Button>
      </HStack>
    </VStack>
  );
}

export function SakFilområde({ filer }: { filer: FilNode[] }) {
  const harFiler = filer.length > 0;

  return (
    <Box padding="space-6" borderRadius="8" background="raised">
      <HStack justify="space-between" align="center" className="mb-4">
        <Heading level="2" size="small">
          Filer
        </Heading>
        {harFiler && (
          <HStack gap="space-2">
            <Button
              size="xsmall"
              variant="tertiary"
              icon={<UploadIcon aria-hidden />}
              onClick={() => {}}
            >
              Last opp fil
            </Button>
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
      {harFiler ? <FilTre noder={filer} /> : <TomtFilområde />}
    </Box>
  );
}
