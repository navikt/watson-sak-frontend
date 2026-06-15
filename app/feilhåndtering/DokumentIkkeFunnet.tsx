import { BodyShort, Box, Heading, List, Link as NavLink, VStack } from "@navikt/ds-react";
import { ListItem } from "@navikt/ds-react/List";
import { Link } from "react-router";
import { RouteConfig } from "~/routeConfig";

type Props = {
  sakId?: string;
};

export function DokumentIkkeFunnet({ sakId }: Props) {
  const sakUrl = sakId ? RouteConfig.SAKER_DETALJ.replace(":sakId", sakId) : null;

  return (
    <Box paddingBlock="space-80 space-64" data-aksel-template="404-v2">
      <VStack gap="space-16">
        <VStack gap="space-12" align="start">
          <div>
            <Heading level="1" size="large" spacing>
              Fant ikke dokumentet
            </Heading>
            <BodyShort>
              Dokumentet kan ha blitt slettet eller flyttet, eller du har mistet tilgang til det.
            </BodyShort>
            <Box marginBlock="space-16" asChild>
              <List>
                {sakUrl && (
                  <ListItem>
                    <NavLink as={Link} to={sakUrl}>
                      Tilbake til saken
                    </NavLink>
                  </ListItem>
                )}
                <ListItem>
                  <NavLink as={Link} to={RouteConfig.INDEX}>
                    Gå til dashboardet
                  </NavLink>
                </ListItem>
              </List>
            </Box>
          </div>
        </VStack>
      </VStack>
    </Box>
  );
}
