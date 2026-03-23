import { BodyShort, Button, Heading, HStack, InfoCard, VStack } from "@navikt/ds-react";
import { useState } from "react";
import { Link as RouterLink } from "react-router";
import { BellIcon, InformationSquareIcon } from "@navikt/aksel-icons";
import { Kort } from "~/komponenter/Kort";
import { RouteConfig } from "~/routeConfig";
import type { Varsel } from "~/varsler/typer";

interface SisteVarslerProps {
  varsler: Varsel[];
  onMarkerSomLest: (varselId: string) => void;
  erSubmitting?: boolean;
}

const ANTALL_SYNLIGE_VARSLER_INITIELT = 3;
const ANTALL_VARSLER_PER_STEG = 5;

export function SisteVarsler({
  varsler,
  onMarkerSomLest,
  erSubmitting = false,
}: SisteVarslerProps) {
  const [antallSynligeVarsler, setAntallSynligeVarsler] = useState(ANTALL_SYNLIGE_VARSLER_INITIELT);

  const synligeVarsler = varsler.slice(0, antallSynligeVarsler);
  const harFlereVarsler = varsler.length > synligeVarsler.length;

  return (
    <Kort as="section">
      <VStack gap="space-4">
        <HStack gap="space-4" align="center">
          <BellIcon aria-hidden fontSize="1.25rem" />
          <Heading level="2" size="medium">
            Siste varsler
          </Heading>
        </HStack>

        {synligeVarsler.length === 0 ? (
          <BodyShort className="text-ax-text-neutral-subtle">
            Du har ingen uleste varsler.
          </BodyShort>
        ) : (
          <>
            <VStack gap="space-4">
              {synligeVarsler.map((varsel) => (
                <InfoCard key={varsel.id} size="small" data-color="info">
                  <InfoCard.Header icon={<InformationSquareIcon aria-hidden />}>
                    <InfoCard.Title as="h3">{varsel.tittel}</InfoCard.Title>
                  </InfoCard.Header>
                  <InfoCard.Content>
                    <VStack gap="space-4">
                      <BodyShort>{varsel.tekst}</BodyShort>
                      <HStack gap="space-4" justify="end">
                        <Button
                          as={RouterLink}
                          to={RouteConfig.SAKER_DETALJ.replace(":sakId", varsel.sakId)}
                          size="small"
                          data-color="accent"
                        >
                          Gå til sak
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="small"
                          data-color="accent"
                          disabled={erSubmitting}
                          onClick={() => onMarkerSomLest(varsel.id)}
                        >
                          Marker som lest
                        </Button>
                      </HStack>
                    </VStack>
                  </InfoCard.Content>
                </InfoCard>
              ))}
            </VStack>

            {harFlereVarsler ? (
              <HStack justify="end">
                <Button
                  type="button"
                  variant="tertiary"
                  size="small"
                  onClick={() => {
                    setAntallSynligeVarsler(
                      (nåværendeAntall) => nåværendeAntall + ANTALL_VARSLER_PER_STEG,
                    );
                  }}
                >
                  Vis flere
                </Button>
              </HStack>
            ) : null}
          </>
        )}
      </VStack>
    </Kort>
  );
}
