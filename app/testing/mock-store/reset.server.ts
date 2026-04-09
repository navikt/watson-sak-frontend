import { resetMockSaker } from "./saker/fordeling.server";
import { resetMockMineSaker } from "./saker/mine-saker.server";
import { resetHistorikk } from "./historikk.server";
import { resetMockVarsler } from "./varsler.server";
import { resetMockPersonOppslag } from "./person-oppslag.server";

export function resetMockStore() {
  resetMockSaker();
  resetMockMineSaker();
  resetHistorikk();
  resetMockVarsler();
  resetMockPersonOppslag();
}
