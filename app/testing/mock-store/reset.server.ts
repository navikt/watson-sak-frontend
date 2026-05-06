import { resetMockSaker } from "./saker/fordeling.server";
import { resetMockMineSaker } from "./saker/mine-saker.server";
import { resetHistorikk } from "./historikk.server";
import { resetMockVarsler } from "./varsler.server";
import { resetMockFiler } from "./filer.server";

export function resetMockStore() {
  resetMockSaker();
  resetMockMineSaker();
  resetHistorikk();
  resetMockVarsler();
  resetMockFiler();
}
