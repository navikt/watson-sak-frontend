import { ArrowRightIcon } from "@navikt/aksel-icons";
import { Button, Heading, VStack } from "@navikt/ds-react";
import { useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import type { KontrollsakResponse, TilgjengeligHandling } from "~/saker/types.backend";

interface SakIBeroHandlingerProps {
  sak: KontrollsakResponse;
  tilgjengeligeHandlinger: TilgjengeligHandling[];
}

export function SakIBeroHandlinger({ sak, tilgjengeligeHandlinger }: SakIBeroHandlingerProps) {
  const gjenopptaFetcher = useFetcher();
  const fristillFetcher = useFetcher();
  const kanFristilles = tilgjengeligeHandlinger.some(
    (handling) => handling.handling === "FRISTILL",
  );

  function handleGjenoppta() {
    gjenopptaFetcher.submit(
      { handling: "TA_AV_BERO" },
      {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sak.id)),
      },
    );
  }

  function handleFristill() {
    fristillFetcher.submit(
      { handling: "FRISTILL" },
      {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sak.id)),
      },
    );
  }

  return (
    <VStack gap="space-8" align="stretch">
      <Heading level="2" size="small">
        Handlinger
      </Heading>
      <Button
        variant="primary"
        size="medium"
        icon={<ArrowRightIcon aria-hidden />}
        onClick={handleGjenoppta}
        loading={gjenopptaFetcher.state !== "idle"}
      >
        Fortsett arbeid
      </Button>
      {kanFristilles && (
        <Button
          variant="secondary"
          size="small"
          onClick={handleFristill}
          loading={fristillFetcher.state !== "idle"}
        >
          Fristill sak
        </Button>
      )}
    </VStack>
  );
}
