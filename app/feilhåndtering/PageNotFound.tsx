import { BodyShort } from "@navikt/ds-react";

import {
  Box,
  Heading,
  List,
  Link as NavLink,
  Page,
  VStack,
} from "@navikt/ds-react";
import { ListItem } from "@navikt/ds-react/List";
import { PageBlock } from "@navikt/ds-react/Page";
import { Link } from "react-router";
import { AppFooter } from "~/layout/AppFooter";
import { AppHeader } from "~/layout/AppHeader";
import { useMiljø } from "~/miljø/useMiljø";
import { RouteConfig } from "~/routeConfig";

export function PageNotFound() {
  const miljø = useMiljø();
  return (
    <Page footer={<AppFooter />}>
      <AppHeader />
      <title>
        {`Fant ikke side – Watson Sak Admin ${miljø !== "prod" ? `(${miljø})` : ""}`}
      </title>
      <PageBlock as="main" width="xl" gutters>
        <Box paddingBlock="20 16" data-aksel-template="404-v2">
          <VStack gap="space-16">
            <VStack gap="space-12" align="start">
              <div>
                <Heading level="1" size="large" spacing>
                  Beklager, vi fant ikke siden
                </Heading>
                <BodyShort>
                  Denne siden kan være slettet eller flyttet, eller det er en
                  feil i lenken.
                </BodyShort>
                <List>
                  <ListItem>Bruk gjerne søket eller menyen</ListItem>
                  <ListItem>
                    <NavLink as={Link} to={RouteConfig.INDEX}>
                      Gå til forsiden
                    </NavLink>
                  </ListItem>
                </List>
              </div>
            </VStack>
          </VStack>
        </Box>
      </PageBlock>
    </Page>
  );
}
