/**
 * Kobler en domenekode (statuskode, aldersbøtte eller kategorikode) til en
 * Aksel-fargetoken. Dette er en presentasjonsbeslutning, og hører derfor
 * hjemme i frontend – backend skal bare levere stabile domenekoder.
 */
export function fargeForKode(kode: string): string {
  // Aldersbøtter kan komme med tankestrek ("12–24") fra mock/visning, mens
  // backend bruker vanlig bindestrek ("12-24"). Normaliser før oppslag.
  switch (kode.replace(/[–—]/g, "-")) {
    case "AVSLUTTET":
    case "HENLAGT":
    case ">24":
      return "--ax-danger-700";
    case "12-24":
    case "9-12":
      return "--ax-warning-600";
    default:
      return "--ax-brand-blue-600";
  }
}
