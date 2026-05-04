import type { KontrollsakStatus } from "~/saker/types.backend";

export function erAktivSakKontrollsak(status: KontrollsakStatus): boolean {
  return status !== "AVSLUTTET";
}
