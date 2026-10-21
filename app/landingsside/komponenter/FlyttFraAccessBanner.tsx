import { InboxDownIcon } from "@navikt/aksel-icons";
import { BodyShort, Box, Button, Heading, HStack, VStack } from "@navikt/ds-react";
import { Link } from "react-router";
import { RouteConfig } from "~/routeConfig";

/** Vises bare når innlogget bruker har saker i Access som ikke er ferdig flyttet. */
export function FlyttFraAccessBanner() {
  return (
    <Box
      background="warning-moderate"
      borderColor="warning"
      borderWidth="0 0 0 4"
      borderRadius="8"
      padding="space-16"
    >
      <HStack gap="space-16" align="center" justify="space-between" wrap>
        <HStack gap="space-16" align="center" wrap={false}>
          <InboxDownIcon fontSize="2.5rem" aria-hidden />
          <VStack gap="space-4">
            <Heading level="2" size="small">
              Du har saker i Access som skal flyttes!
            </Heading>
            <BodyShort size="small">
              Flytt sakene dine og alle tilhørende filer fra Access og S-området over til Watson Sak.
            </BodyShort>
          </VStack>
        </HStack>
        <Button as={Link} to={RouteConfig.MIGRERING} icon={<InboxDownIcon aria-hidden />}>
          Flytt fra Access
        </Button>
      </HStack>
    </Box>
  );
}
