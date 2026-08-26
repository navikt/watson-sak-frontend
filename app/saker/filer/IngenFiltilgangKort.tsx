import { PadlockLockedIcon } from "@navikt/aksel-icons";
import { BodyShort, Heading, VStack } from "@navikt/ds-react";
import { Kort } from "~/komponenter/Kort";
import type { KontrollsakResponse } from "~/saker/types.backend";

type Props = {
  sak: KontrollsakResponse;
};

/**
 * Vises i stedet for dokumenter og vedlegg når innlogget bruker ikke har tilgang.
 *
 * Årsaker til manglende tilgang:
 * - Bruker er verken eier eller delt-med på saken (basic eller utvidet tilgang)
 * - Saken gjelder en skjermet person og bruker mangler utvidet tilgang
 */
export function IngenFiltilgangKort({ sak }: Props) {
  const melding = sak.adresseskjermet
    ? "Du må ha utvidet tilgang for å se dokumenter og vedlegg på skjermede saker."
    : "Du må få delt tilgang til saken for å kunne se dokumenter og vedlegg.";

  return (
    <Kort>
      <VStack gap="space-4" align="center" className="text-center">
        <PadlockLockedIcon aria-hidden fontSize="1.5rem" />
        <Heading level="2" size="small">
          Dokumenter og vedlegg
        </Heading>
        <BodyShort size="small">{melding}</BodyShort>
      </VStack>
    </Kort>
  );
}
