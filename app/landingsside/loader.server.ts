import { mockMineSaker } from "~/mine-saker/mock-data.server";
import { sorterSakerEtterDato } from "~/saker/utils";
import { hentUlesteVarsler } from "~/varsler/mock-data.server";

export function loader() {
  const mineSaker = sorterSakerEtterDato(mockMineSaker, "nyest").slice(0, 5);
  const varsler = hentUlesteVarsler();

  return { mineSaker, varsler };
}
