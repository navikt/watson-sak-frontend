import {
  BodyShort,
  Box,
  HGrid,
  Heading,
  Link,
  List,
  Page,
  VStack,
} from "@navikt/ds-react";
import { ListItem } from "@navikt/ds-react/List";
import { AppFooter } from "~/layout/AppFooter";
import { AppHeader } from "~/layout/AppHeader";

export function InternalServerError() {
  return (
    <Page footer={<AppFooter />}>
      <title>Feil – Watson Sak</title>
      <AppHeader />
      <Page.Block as="main" width="xl" gutters>
        <Box paddingBlock="space-80 space-32">
          <HGrid columns="minmax(auto,600px)" data-aksel-template="500-v2">
            <VStack gap="space-16">
              <VStack gap="space-12" align="start">
                <div>
                  <BodyShort textColor="subtle" size="small">
                    Statuskode 500
                  </BodyShort>
                  <Heading level="1" size="large" spacing>
                    Beklager, noe gikk galt.
                  </Heading>
                  <BodyShort spacing>
                    En teknisk feil på våre servere gjør at siden er
                    utilgjengelig. Dette skyldes ikke noe du gjorde.
                  </BodyShort>
                  <BodyShort>Du kan prøve å</BodyShort>
                  <Box marginBlock="space-16" asChild>
                    <List>
                      <ListItem>
                        vente noen minutter og{" "}
                        <Link href="#" onClick={() => location.reload()}>
                          laste siden på nytt
                        </Link>
                      </ListItem>
                      <ListItem>
                        <Link href="#" onClick={() => history.back()}>
                          gå tilbake til forrige side
                        </Link>
                      </ListItem>
                    </List>
                  </Box>
                  <BodyShort>
                    Hvis problemet vedvarer, kan du melde inn feil i Porten.
                  </BodyShort>
                </div>
              </VStack>

              <div>
                <Heading level="1" size="large" spacing>
                  Something went wrong
                </Heading>
                <BodyShort spacing>
                  This was caused by a technical fault on our servers. Please
                  refresh this page or try again in a few minutes.{" "}
                </BodyShort>
                <BodyShort>
                  If the problem persists, you can report the error in Porten.
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
