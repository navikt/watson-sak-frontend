import type { AnsattOversikt } from "./beregninger";
import type { LederAdvarsel } from "./velkomst";
import { AdvarslerLeder } from "./komponenter/AdvarslerLeder";
import { AnsatteOversikt } from "./komponenter/AnsatteOversikt";

export interface LederOversiktProps {
  enhetId: string;
  advarsler: LederAdvarsel[];
  ansatteOversikt: AnsattOversikt[];
}

/** Hoveddashboardet ledere ser på forsiden i stedet for saksbehandlers
 * personlige oversikt. Viser enhetens advarsler og en oversikt over antall
 * saker per saksbehandler i enheten. */
export function LederOversikt({ enhetId, advarsler, ansatteOversikt }: LederOversiktProps) {
  return (
    <>
      <AdvarslerLeder advarsler={advarsler} />
      <AnsatteOversikt ansatte={ansatteOversikt} enhetId={enhetId} />
    </>
  );
}
