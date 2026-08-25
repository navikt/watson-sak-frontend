import { PadlockLockedIcon } from "@navikt/aksel-icons";
import { BodyShort, Heading, VStack } from "@navikt/ds-react";
import { Kort } from "~/komponenter/Kort";

/**
 * Vises i stedet for dokumenter og vedlegg når innlogget bruker ikke er
 * saksbehandler (eier eller delt-med) på saken. Filområdet kan i praksis vise
 * innhold uten reell tilgang for enkelte tilgrensende roller (f.eks. ansvarlig
 * på en koblet sak), men den enkelte dokumentsiden krever direkte tilgang —
 * derfor skjules hele blokken heller enn å vise lenker brukeren ikke kan åpne.
 */
export function IngenFiltilgangKort() {
  return (
    <Kort>
      <VStack gap="space-4" align="center" className="text-center">
        <PadlockLockedIcon aria-hidden fontSize="1.5rem" />
        <Heading level="2" size="small">
          Dokumenter og vedlegg
        </Heading>
        <BodyShort size="small">
          Du må få delt tilgang til saken for å kunne se dokumenter og vedlegg.
        </BodyShort>
      </VStack>
    </Kort>
  );
}
