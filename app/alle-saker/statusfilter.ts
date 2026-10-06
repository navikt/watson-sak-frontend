import {
  kontrollsakStatusSchema,
  type KontrollsakResponse,
  type KontrollsakStatus,
  type KontrollsakSteg,
} from "~/saker/types.backend";
import { formaterStatus } from "~/saker/visning";

export type Statusfilter = KontrollsakStatus | "HOS_FORVALTNING" | "HOS_POLITI";

export const STATUSFILTER_VALG = [
  ...kontrollsakStatusSchema.options.map((value) => ({ value, label: formaterStatus(value) })),
  { value: "HOS_FORVALTNING", label: "Hos forvaltning" },
  { value: "HOS_POLITI", label: "Hos politiet" },
] satisfies { value: Statusfilter; label: string }[];

export function parseStatusfilter(verdier: string[]): Statusfilter[] {
  return STATUSFILTER_VALG.filter(({ value }) => verdier.includes(value)).map(({ value }) => value);
}

export function tilBackendStatusfilter(verdier: Statusfilter[]) {
  const status: KontrollsakStatus[] = [];
  const statusSteg: KontrollsakSteg[] = [];
  for (const verdi of verdier) {
    if (verdi === "HOS_FORVALTNING") statusSteg.push("FORVALTNING");
    else if (verdi === "HOS_POLITI") statusSteg.push("POLITI");
    else status.push(verdi);
  }
  return {
    status: status.length > 0 ? status : undefined,
    statusSteg: statusSteg.length > 0 ? statusSteg : undefined,
  };
}

export function matcherStatusfilter(sak: KontrollsakResponse, verdier: Statusfilter[]): boolean {
  return (
    verdier.length === 0 ||
    verdier.some((verdi) => {
      if (verdi === "HOS_FORVALTNING") return sak.steg === "FORVALTNING";
      if (verdi === "HOS_POLITI") return sak.steg === "POLITI" || sak.steg === "ANMELDT";
      return sak.status === verdi;
    })
  );
}
