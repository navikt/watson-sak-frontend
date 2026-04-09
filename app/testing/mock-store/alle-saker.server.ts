import type { KontrollsakResponse } from "~/saker/types.backend";
import { mockKontrollsaker } from "./saker/fordeling.server";
import { mockMineKontrollsaker } from "./saker/mine-saker.server";

export function hentAlleSaker(): KontrollsakResponse[] {
  return [...mockKontrollsaker, ...mockMineKontrollsaker];
}
