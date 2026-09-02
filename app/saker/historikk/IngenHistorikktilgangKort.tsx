import { PadlockLockedIcon } from "@navikt/aksel-icons";
import { BodyShort, Heading, VStack } from "@navikt/ds-react";
import { Kort } from "~/komponenter/Kort";

const TEKST: Record<"ikke-delt" | "skjermet", string> = {
  "ikke-delt": "Du må få delt tilgang til saken for å kunne se historikk.",
  skjermet: "Denne saken er skjermet. Du må ha utvidet tilgang for å se historikk.",
};

interface IngenHistorikktilgangKortProps {
  /**
   * `"ikke-delt"`: innlogget bruker er verken sakseier eller delt-med.
   * `"skjermet"`: saken er adresseskjermet og krever utvidet tilgang
   * (`sak.tilgang.kanSeHistorikk` fra backend er `false`).
   */
  årsak: "ikke-delt" | "skjermet";
}

/**
 * Vises i stedet for historikk når innlogget bruker ikke har tilgang til å se
 * den, etter samme mønster som `IngenFiltilgangKort` for dokumenter og
 * vedlegg.
 */
export function IngenHistorikktilgangKort({ årsak }: IngenHistorikktilgangKortProps) {
  return (
    <Kort>
      <VStack gap="space-4" align="center" className="text-center">
        <PadlockLockedIcon aria-hidden fontSize="1.5rem" />
        <Heading level="2" size="small">
          Historikk
        </Heading>
        <BodyShort size="small">{TEKST[årsak]}</BodyShort>
      </VStack>
    </Kort>
  );
}
