import { BodyLong, Box, Heading, Link, List, Page } from "@navikt/ds-react";
import { ListItem } from "@navikt/ds-react/List";
import { PageBlock } from "@navikt/ds-react/Page";
import { useMiljø } from "~/miljø/useMiljø";

export default function PersonvernSide() {
  const miljø = useMiljø();
  return (
    <Page>
      <PageBlock width="text" gutters>
        <title>{`Personvern – Watson Sak ${miljø !== "prod" ? `(${miljø})` : ""}`}</title>
        <Heading level="1" size="large" spacing className="mt-4">
          Personvern
        </Heading>
        <BodyLong size="large" spacing>
          Når du bruker tjenesten, lagrer vi informasjon om hva du foretar deg. Her kan du lese mer
          om hva som registreres, og hvordan vi bruker informasjonen.
        </BodyLong>
        <Heading level="2" size="medium" spacing>
          Hva samler vi inn?
        </Heading>
        <BodyLong spacing>
          Alle aktiviteter du foretar deg på tjenesten blir lagret i en audit-logg. Dette gjøres for
          å sikre sporbarhet av det som gjøres i tjenesten.
        </BodyLong>
        <BodyLong spacing>
          I tillegg til dette, lagrer vi også informasjon om hvordan du bruker tjenesten i
          tjenestene Umami. Dette gjøres for å kvantitativt analysere bruk av tjenesten, slik at vi
          kan videreutvikle og forbedre den. Eksempler på hva vi samler inn er:
        </BodyLong>
        <div className="mb-4">
          <Box marginBlock="space-16" asChild>
            <List>
              <ListItem>Hvilke knapper du trykker på</ListItem>
              <ListItem>Om du trykker på hjelpetekster</ListItem>
              <ListItem>Hvilke lenker i løsningen du trykker på</ListItem>
              <ListItem>Hvilke sider du er inne på</ListItem>
            </List>
          </Box>
        </div>

        <Heading level="2" size="medium" spacing>
          Funksjonelle cookies
        </Heading>
        <BodyLong spacing>
          Løsningen bruker cookies for å holde styr på hvilket tema du har valgt som bruker. Denne
          cookien lagres i opptil et år, gitt at du velger et tema eksplisitt.
        </BodyLong>
        <Heading level="2" size="medium" spacing>
          Spørsmål?
        </Heading>
        <BodyLong spacing>
          Har du spørsmål om personvern eller om hvordan vi bruker informasjonen vi samler inn, kan
          du kontakte teamet på <Link href="mailto:espen.einn@nav.no">espen.einn@nav.no</Link>.
        </BodyLong>
      </PageBlock>
    </Page>
  );
}
