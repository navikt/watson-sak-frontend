import { ArrowRightIcon, ClockDashedIcon, DocPencilIcon, PencilIcon } from "@navikt/aksel-icons";
import { Button, Heading, VStack } from "@navikt/ds-react";
import { useState } from "react";
import { useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { EndreStatusModal } from "./EndreStatusModal";
import { hentTilgjengeligeSakshandlinger, type Sakshandling } from "./tilgjengeligeHandlinger";
import { OpprettNotatModal } from "./OpprettNotatModal";
import { SettPaVentModal } from "./SettPaVentModal";

interface SakHandlingerKnapperProps {
  sak: KontrollsakResponse;
}

type ModalHandling = Exclude<Sakshandling, "gjenoppta">;

const handlingsvisning: Record<
  Sakshandling,
  {
    label: string;
    variant: "primary" | "secondary" | "secondary-neutral";
    icon: React.ReactNode;
  }
> = {
  "endre-status": {
    label: "Endre status",
    variant: "primary",
    icon: <PencilIcon aria-hidden />,
  },
  "sett-pa-vent": {
    label: "Sett på vent",
    variant: "secondary",
    icon: <ClockDashedIcon aria-hidden />,
  },
  gjenoppta: {
    label: "Gjenoppta",
    variant: "primary",
    icon: <ArrowRightIcon aria-hidden />,
  },
  "opprett-notat": {
    label: "Opprett notat",
    variant: "secondary-neutral",
    icon: <DocPencilIcon aria-hidden />,
  },
};

export function SakHandlingerKnapper({ sak }: SakHandlingerKnapperProps) {
  const gjenopptaFetcher = useFetcher();
  const [åpenModal, setÅpenModal] = useState<ModalHandling | null>(null);
  const handlinger = hentTilgjengeligeSakshandlinger(sak);
  const primærhandlinger = handlinger.filter((handling) => handling !== "opprett-notat");
  const visNotathandling = handlinger.includes("opprett-notat");

  if (handlinger.length === 0) {
    return null;
  }

  function handleGjenoppta() {
    gjenopptaFetcher.submit(
      { handling: "gjenoppta" },
      {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sak.id)),
      },
    );
  }

  function handleKlikk(handling: Sakshandling) {
    if (handling === "gjenoppta") {
      handleGjenoppta();
      return;
    }

    setÅpenModal(handling);
  }

  return (
    <>
      <VStack gap="space-4" align="stretch">
        <Heading level="2" size="small">
          Handlinger
        </Heading>

        {primærhandlinger.map((handling) => {
          const visning = handlingsvisning[handling];

          return (
            <Button
              key={handling}
              variant={visning.variant}
              size="medium"
              icon={visning.icon}
              onClick={() => handleKlikk(handling)}
              loading={handling === "gjenoppta" && gjenopptaFetcher.state !== "idle"}
            >
              {visning.label}
            </Button>
          );
        })}

        {visNotathandling ? (
          <>
            <hr className="my-4 border-ax-border-neutral-subtle" />
            <Button
              variant={handlingsvisning["opprett-notat"].variant}
              size="medium"
              icon={handlingsvisning["opprett-notat"].icon}
              onClick={() => handleKlikk("opprett-notat")}
            >
              {handlingsvisning["opprett-notat"].label}
            </Button>
          </>
        ) : null}
      </VStack>

      <EndreStatusModal
        sakId={sak.id}
        nåværendeStatus={sak.status}
        åpen={åpenModal === "endre-status"}
        onClose={() => setÅpenModal(null)}
      />
      <SettPaVentModal
        sakId={sak.id}
        åpen={åpenModal === "sett-pa-vent"}
        onClose={() => setÅpenModal(null)}
      />
      <OpprettNotatModal
        sakId={sak.id}
        åpen={åpenModal === "opprett-notat"}
        onClose={() => setÅpenModal(null)}
      />
    </>
  );
}
