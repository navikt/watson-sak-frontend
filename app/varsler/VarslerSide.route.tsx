import { BellIcon, InformationSquareIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Heading, HStack, InfoCard, Tag, VStack } from "@navikt/ds-react";
import { useEffect, useState } from "react";
import { Form, Link as RouterLink, useFetcher, useLoaderData } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import type { Varsel } from "./typer";
import type { loader } from "./VarslerSide.loader.server";

export { action } from "./VarslerSide.action.server";
export { loader } from "./VarslerSide.loader.server";

export default function VarslerSide() {
  const loaderData = useLoaderData<typeof loader>();
  const lastFlereFetcher = useFetcher<typeof loader>();
  const [akkumulerteVarsler, setAkkumulerteVarsler] = useState<Varsel[]>(loaderData.varsler);
  const [nesteSide, setNesteSide] = useState(loaderData.page + 1);
  const [harFlere, setHarFlere] = useState(loaderData.harFlere);

  useEffect(() => {
    if (lastFlereFetcher.data) {
      setAkkumulerteVarsler((prev) => [...prev, ...lastFlereFetcher.data!.varsler]);
      setNesteSide(lastFlereFetcher.data.page + 1);
      setHarFlere(lastFlereFetcher.data.harFlere);
    }
  }, [lastFlereFetcher.data]);

  const ulesteVarsler = akkumulerteVarsler.filter((v) => !v.erLest);

  return (
    <>
      <title>Varsler – Watson Sak</title>
      <VStack gap="space-8" className="mt-4 mb-8">
        <HStack gap="space-4" align="center" justify="space-between">
          <HStack gap="space-4" align="center">
            <BellIcon aria-hidden fontSize="1.5rem" />
            <Heading level="1" size="large">
              Varsler
            </Heading>
          </HStack>

          {ulesteVarsler.length > 0 && (
            <Form method="post">
              <input type="hidden" name="handling" value="marker_alle_som_lest" />
              {ulesteVarsler.map((v) => (
                <input key={v.id} type="hidden" name="varselId" value={v.id} />
              ))}
              <Button type="submit" variant="secondary" size="small">
                Merk alle som lest
              </Button>
            </Form>
          )}
        </HStack>

        {akkumulerteVarsler.length === 0 ? (
          <BodyShort className="text-ax-text-neutral-subtle">Du har ingen varsler.</BodyShort>
        ) : (
          <VStack gap="space-4">
            {akkumulerteVarsler.map((varsel) => (
              <InfoCard
                key={varsel.id}
                size="small"
                data-color={varsel.erLest ? "neutral" : "info"}
              >
                <InfoCard.Header icon={<InformationSquareIcon aria-hidden />}>
                  <HStack gap="space-2" align="center">
                    <InfoCard.Title as="h2">{varsel.tittel}</InfoCard.Title>
                    {!varsel.erLest && (
                      <Tag variant="info" size="xsmall">
                        Ulest
                      </Tag>
                    )}
                  </HStack>
                </InfoCard.Header>
                <InfoCard.Content>
                  <VStack gap="space-4">
                    <BodyShort>{varsel.tekst}</BodyShort>
                    <HStack gap="space-4" justify="end">
                      <Button
                        as={RouterLink}
                        to={RouteConfig.SAKER_DETALJ.replace(
                          ":sakId",
                          getSaksreferanse(varsel.sakId),
                        )}
                        size="small"
                        data-color="accent"
                        onClick={() => sporHendelse("varsel åpnet fra varsler-side")}
                      >
                        Gå til sak
                      </Button>
                    </HStack>
                  </VStack>
                </InfoCard.Content>
              </InfoCard>
            ))}

            {harFlere && (
              <HStack justify="center">
                <Button
                  type="button"
                  variant="tertiary"
                  size="small"
                  loading={lastFlereFetcher.state !== "idle"}
                  onClick={() => {
                    lastFlereFetcher.load(`${RouteConfig.VARSLER}?page=${nesteSide}`);
                  }}
                >
                  Last flere
                </Button>
              </HStack>
            )}
          </VStack>
        )}
      </VStack>
    </>
  );
}
