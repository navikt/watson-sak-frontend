import { EyeIcon } from "@navikt/aksel-icons";
import { Button } from "@navikt/ds-react";
import { sporHendelse } from "~/analytics/analytics";
import { RouteConfig } from "~/routeConfig";

/**
 * Formaterer en ISO-tidsstempel-streng som en norsk dato (dag, kort måned, år).
 * Inneholder bevisst ikke klokkeslett — bruk et annet format om det trengs.
 */
export function formaterDato(isoString: string): string {
  return new Date(isoString).toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface ÅpneFilKnappProps {
  filId: string;
  filnavn: string;
  sakId: string;
}

/** Knapp som åpner/forhåndsviser en fil i en ny fane. Laster ikke ned filen til disk. */
export function ÅpneFilKnapp({ filId, filnavn, sakId }: ÅpneFilKnappProps) {
  const url = RouteConfig.API.SAK_FIL.replace(":sakId", sakId).replace(":filId", filId);

  function håndterÅpning() {
    sporHendelse("vedlegg åpnet", { sakId });
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <Button
      type="button"
      variant="tertiary-neutral"
      size="xsmall"
      icon={<EyeIcon aria-hidden />}
      aria-label={`Åpne ${filnavn}`}
      onClick={håndterÅpning}
    />
  );
}
