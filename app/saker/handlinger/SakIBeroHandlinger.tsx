import { ArrowRightIcon, DocPencilIcon } from "@navikt/aksel-icons";
import { Button, Heading, VStack } from "@navikt/ds-react";
import { useState } from "react";
import { useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { OpprettNotatModal } from "./OpprettNotatModal";

interface SakIBeroHandlingerProps {
  sak: KontrollsakResponse;
}

export function SakIBeroHandlinger({ sak }: SakIBeroHandlingerProps) {
  const gjenopptaFetcher = useFetcher();
  const [notatModalÅpen, setNotatModalÅpen] = useState(false);

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
    <>
      <VStack gap="space-4" align="stretch">
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
          Gjenoppta
        </Button>

        <hr className="my-4 border-ax-border-neutral-subtle" />

        <Button
          variant="secondary-neutral"
          size="medium"
          icon={<DocPencilIcon aria-hidden />}
          onClick={() => setNotatModalÅpen(true)}
        >
          Send notat
        </Button>
      </VStack>

      <OpprettNotatModal
        sakId={sak.id}
        åpen={notatModalÅpen}
        onClose={() => setNotatModalÅpen(false)}
      />
    </>
  );
}
