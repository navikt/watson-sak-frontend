import type { AnsattOversikt } from "./beregninger";
import { AnsatteOversikt } from "./komponenter/AnsatteOversikt";

export interface LederOversiktProps {
  enhetId: string;
  ansatteOversikt: AnsattOversikt[];
}

/** Hoveddashboardet ledere ser på forsiden i stedet for saksbehandlers
 * personlige oversikt. */
export function LederOversikt({ enhetId, ansatteOversikt }: LederOversiktProps) {
  return <AnsatteOversikt ansatte={ansatteOversikt} enhetId={enhetId} />;
}
