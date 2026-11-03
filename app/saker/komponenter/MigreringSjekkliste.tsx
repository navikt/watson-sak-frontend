import { BodyShort, Box, Button, Checkbox, Heading, VStack } from "@navikt/ds-react";
import { useState } from "react";
import { Form, useActionData } from "react-router";
import { Innsendingsfeil } from "~/feilhåndtering/Innsendingsfeil";
import { INNSENDINGSFEIL } from "~/feilhåndtering/feilmeldinger";

type Props = {
  /** Når `false` vises sjekklisten som forhåndsvisning uten mulighet for å lagre. */
  kanLagres: boolean;
};

/**
 * Sjekklisten saksbehandler må krysse av før en migrert sak kan merkes som ferdig flyttet.
 * Avkrysningene lagres ikke, men sendes med skjemaet og valideres i action.
 */
export function MigreringSjekkliste({ kanLagres }: Props) {
  const [lastetOppFiler, setLastetOppFiler] = useState(false);
  const [overførtInformasjon, setOverførtInformasjon] = useState(false);
  const svar = useActionData();
  const alleKryssetAv = lastetOppFiler && overførtInformasjon;

  return (
    <Box
      background="info-soft"
      borderColor="info-subtle"
      borderWidth="1"
      borderRadius="8"
      padding="space-16"
    >
      <Form method="post">
        <input type="hidden" name="handling" value="MIGRERING_FERDIGSTILL" />
        <VStack gap="space-16" align="start">
          <VStack gap="space-4">
            <Heading level="2" size="xsmall">
              Sjekkliste – flytt fra Access
            </Heading>
            <BodyShort size="small">
              Fullfør alle punktene for å flytte saken fra Access til Watson Sak.
            </BodyShort>
          </VStack>
          <VStack gap="space-8">
            <Checkbox
              name="lastetOppFiler"
              value="ja"
              checked={lastetOppFiler}
              disabled={!kanLagres}
              onChange={(event) => setLastetOppFiler(event.target.checked)}
            >
              Lastet opp alle filer fra S:
            </Checkbox>
            <Checkbox
              name="overfortInformasjon"
              value="ja"
              checked={overførtInformasjon}
              disabled={!kanLagres}
              onChange={(event) => setOverførtInformasjon(event.target.checked)}
            >
              Overført all informasjon fra Access
            </Checkbox>
          </VStack>
          <Button type="submit" size="small" disabled={!kanLagres || !alleKryssetAv}>
            Marker saken som ferdig flyttet
          </Button>
          <Innsendingsfeil svar={svar} tekster={INNSENDINGSFEIL.ferdigFlyttet} />
          {!kanLagres && (
            <BodyShort size="small" textColor="subtle">
              Forhåndsvisning. Ferdigmerking kan ikke lagres ennå.
            </BodyShort>
          )}
        </VStack>
      </Form>
    </Box>
  );
}
