import { BodyShort, Box, Button, Heading, Page, VStack } from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { AppFooter } from "~/layout/AppFooter";
import { AppHeader } from "~/layout/AppHeader";
import { MiljøtilpassetTittel } from "~/layout/MiljøtilpassetTittel";

/**
 * Vises når backend avviser et kall fordi saksbehandlerens sesjon har
 * utløpt eller blitt logget ut mens siden var åpen (HTTP 401). Uten denne
 * siden ville brukeren møtt en generisk 500-feilside.
 */
export function IkkeInnlogget() {
  return (
    <Page footer={<AppFooter />}>
      <MiljøtilpassetTittel>Du er logget ut – Watson Sak</MiljøtilpassetTittel>
      <AppHeader />
      <PageBlock as="main" width="xl" gutters>
        <Box paddingBlock="space-80 space-32">
          <VStack gap="space-16" align="start">
            <BodyShort textColor="subtle" size="small">
              Statuskode 401
            </BodyShort>
            <Heading level="1" size="large" spacing>
              Du har blitt logget ut
            </Heading>
            <BodyShort spacing>
              Sesjonen din har utløpt, eller du har blitt logget ut mens siden var åpen. Logg inn på
              nytt for å fortsette.
            </BodyShort>
            <Button as="a" href="/oauth2/login">
              Logg inn på nytt
            </Button>
          </VStack>
        </Box>
      </PageBlock>
    </Page>
  );
}
