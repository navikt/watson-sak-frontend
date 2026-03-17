import { mockSaker } from "~/fordeling/mock-data.server";
import { mockMineSaker } from "~/mine-saker/mock-data.server";
import type { Sak } from "./typer";

/** Henter alle saker (fordeling + mine saker) med ferske referanser */
export function hentAlleSaker(): Sak[] {
  return [...mockSaker, ...mockMineSaker];
}
