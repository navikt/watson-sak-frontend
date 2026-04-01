import { mockKontrollsaker } from "~/fordeling/mock-data.server";
import { mockMineKontrollsaker } from "~/mine-saker/mock-data.server";
import type { KontrollsakResponse } from "./types.backend";

export function hentAlleSaker(): KontrollsakResponse[] {
  return [...mockKontrollsaker, ...mockMineKontrollsaker];
}
