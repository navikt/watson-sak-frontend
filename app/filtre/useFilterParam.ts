import { useSearchParams } from "react-router";
import { parseMultiValueParam } from "./parseMultiValueParam";

/**
 * Hook for å lese og toggle en multi-value URL search param.
 *
 * Støtter både repeated params (?k=A&k=B) og komma-separerte (?k=A,B) for bakoverkompatibilitet.
 * Skriver alltid repeated params tilbake.
 */
export function useFilterParam(nøkkel: string, options: { resetKeys?: string[] } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const valgteVerdier = parseMultiValueParam(searchParams, nøkkel);

  function toggle(verdi: string) {
    setSearchParams((forrige) => {
      const neste = new URLSearchParams(forrige);
      const gjeldende = parseMultiValueParam(forrige, nøkkel);

      neste.delete(nøkkel);

      const oppdaterte = gjeldende.includes(verdi)
        ? gjeldende.filter((v) => v !== verdi)
        : [...gjeldende, verdi];

      for (const v of oppdaterte) {
        neste.append(nøkkel, v);
      }

      for (const key of options.resetKeys ?? []) {
        neste.delete(key);
      }

      return neste;
    });
  }

  return { valgteVerdier, toggle };
}
