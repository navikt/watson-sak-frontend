import { BodyShort, Box, Button, HGrid, Heading, List, Page, VStack } from "@navikt/ds-react";
import { ListItem } from "@navikt/ds-react/List";
import { FEILEN_ER_REGISTRERT } from "~/feilhåndtering/Feilmelding";
import { AppFooter } from "~/layout/AppFooter";
import { AppHeader } from "~/layout/AppHeader";
import { MiljøtilpassetTittel } from "~/layout/MiljøtilpassetTittel";

export function InternalServerError() {
  return (
    <Page footer={<AppFooter />}>
      <MiljøtilpassetTittel>Feil – Watson Sak</MiljøtilpassetTittel>
      <AppHeader />
      <Page.Block as="main" width="xl" gutters>
        <Box paddingBlock="space-80 space-32">
          <HGrid columns="minmax(auto,600px)" data-aksel-template="500-v2">
            <VStack gap="space-16">
              <VStack gap="space-12" align="start">
                <div>
                  <Heading level="1" size="large" spacing>
                    Vi fikk ikke vist siden
                  </Heading>
                  <BodyShort spacing>
                    Dette er en teknisk feil hos oss, ikke noe du har gjort.
                  </BodyShort>
                  <BodyShort>Du kan prøve å</BodyShort>
                  <Box marginBlock="space-16" asChild>
                    <List>
                      <ListItem>
                        vente noen minutter og{" "}
                        <Button
                          type="button"
                          size="small"
                          variant="tertiary"
                          onClick={() => location.reload()}
                        >
                          laste siden på nytt
                        </Button>
                      </ListItem>
                      <ListItem>
                        <Button
                          type="button"
                          size="small"
                          variant="tertiary"
                          onClick={() => history.back()}
                        >
                          gå tilbake til forrige side
                        </Button>
                      </ListItem>
                    </List>
                  </Box>
                  <BodyShort>
                    {FEILEN_ER_REGISTRERT} Hvis problemet fortsetter, kan du melde feilen i Porten.
                  </BodyShort>
                </div>
              </VStack>

              <div>
                <Heading level="1" size="large" spacing>
                  We could not show the page
                </Heading>
                <BodyShort spacing>
                  This is due to a technical error on our end, not anything you did.
                </BodyShort>
                <BodyShort>Try again in a few minutes or go back to the previous page.</BodyShort>
                <BodyShort>
                  The error has been registered. If the problem persists, you can report the error
                  in Porten.
                </BodyShort>
              </div>
            </VStack>
          </HGrid>
        </Box>
      </Page.Block>
      <Env />
    </Page>
  );
}

const MILJO_URL = "https://www.nav.no/dekoratoren";

function Env({ languages }: { languages?: { locale: string; url: string }[] }) {
  return (
    <div
      id="decorator-env"
      data-src={`${MILJO_URL}/env?context=privatperson&simple=true${
        languages
          ? `&availableLanguages=[${languages
              .map((language) => JSON.stringify(language))
              .join(",")}]`
          : ""
      }`}
    />
  );
}
