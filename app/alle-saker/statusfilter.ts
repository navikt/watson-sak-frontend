import {
  kontrollsakStatusSchema,
  type KontrollsakResponse,
  type KontrollsakStatus,
} from "~/saker/types.backend";
import { formaterStatus } from "~/saker/visning";

export type Statusfilter = KontrollsakStatus;

export const STATUSFILTER_VALG = kontrollsakStatusSchema.options.map((value) => ({
  value,
  label: formaterStatus(value),
})) satisfies { value: Statusfilter; label: string }[];

export function parseStatusfilter(verdier: string[]): Statusfilter[] {
  return STATUSFILTER_VALG.filter(({ value }) => verdier.includes(value)).map(({ value }) => value);
}

export function tilBackendStatusfilter(verdier: Statusfilter[]) {
  return { status: verdier.length > 0 ? verdier : undefined };
}

export function matcherStatusfilter(sak: KontrollsakResponse, verdier: Statusfilter[]): boolean {
  return verdier.length === 0 || verdier.some((verdi) => sak.status === verdi);
}
