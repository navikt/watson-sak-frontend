import { mockMineSaker } from "~/mine-saker/mock-data.server";
import { sorterSakerEtterDato } from "~/saker/utils";

export function loader() {
  const mineSaker = sorterSakerEtterDato(mockMineSaker, "nyest").slice(0, 5);

  return { mineSaker };
}
