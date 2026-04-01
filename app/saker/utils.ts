import type { Sak, SakStatus } from "./typer";

type Sorteringsretning = "nyest" | "eldst";

export function sorterSakerEtterDato(saker: Sak[], retning: Sorteringsretning): Sak[] {
  return [...saker].sort((a, b) => {
    const sammenligning = a.datoInnmeldt.localeCompare(b.datoInnmeldt);
    return retning === "nyest" ? -sammenligning : sammenligning;
  });
}

export function filtrerSaker(
  saker: Sak[],
  valgteStatuser: SakStatus[],
  valgteYtelser: string[],
): Sak[] {
  return saker.filter((sak) => {
    const matcherStatus = valgteStatuser.length === 0 || valgteStatuser.includes(sak.status);
    const matcherYtelse =
      valgteYtelser.length === 0 || sak.ytelser.some((ytelse) => valgteYtelser.includes(ytelse));
    return matcherStatus && matcherYtelse;
  });
}

export function hentUnikeYtelser(saker: Sak[]): string[] {
  return [...new Set(saker.flatMap((sak) => sak.ytelser))].sort((a, b) => a.localeCompare(b, "nb"));
}

export function søkISaker(saker: Sak[], søketekst: string): Sak[] {
  const normalisert = søketekst.trim().toLowerCase();
  if (!normalisert) return saker;

  return saker.filter((sak) => {
    const sammenslått = [
      sak.id,
      sak.datoInnmeldt,
      sak.kilde,
      sak.notat,
      sak.fødselsnummer,
      sak.ytelser.join(", "),
      sak.status,
      sak.seksjon,
    ]
      .join(";;")
      .toLowerCase();

    return sammenslått.includes(normalisert);
  });
}
