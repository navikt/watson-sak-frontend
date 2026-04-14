import { ArrowRightIcon } from "@navikt/aksel-icons";
import { Button, Heading, VStack } from "@navikt/ds-react";
import { useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import type { KontrollsakResponse } from "~/saker/types.backend";

interface SakIBeroHandlingerProps {
  sak: KontrollsakResponse;
}

export function SakIBeroHandlinger({ sak }: SakIBeroHandlingerProps) {
  const gjenopptaFetcher = useFetcher();

  function handleGjenoppta() {
    gjenopptaFetcher.submit(
      { handling: "gjenoppta" },
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
    </VStack>
  );
}
