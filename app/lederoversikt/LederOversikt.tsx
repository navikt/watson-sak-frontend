import { AnsatteOversikt } from "./komponenter/AnsatteOversikt";
import type { LederStatistikk } from "./types";
import { VStack } from "@navikt/ds-react";

export interface LederOversiktProps {
  statistikk: LederStatistikk;
}

/** Hoveddashboardet ledere ser på forsiden i stedet for saksbehandlers
 * personlige oversikt. */
export function LederOversikt({ statistikk }: LederOversiktProps) {
  return (
    <VStack gap="space-12">
      <AnsatteOversikt ansatte={statistikk.ansatte} enhetId={statistikk.enhetId} />
    </VStack>
  );
}
