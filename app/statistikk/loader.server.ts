import { getBackendOboToken } from "~/auth/access-token";
import { hentInnloggetBruker } from "~/auth/innlogget-bruker.server";
import { skalBrukeMockdata } from "~/config/env.server";
import { hentStatistikk } from "./api.server";
import { lagMockStatistikk } from "./mock.server";
import type { StatistikkSpørring } from "./types";

const ISO_DATO = /^\d{4}-\d{2}-\d{2}$/;

/** Sjekker at datoen faktisk finnes i kalenderen, ikke bare at strengen har riktig format.
 * `new Date` ruller f.eks. "2026-02-31" over til 3. mars, så vi sjekker at komponentene
 * stemmer overens med det vi ba om. */
function erGyldigDato(streng: string): boolean {
  if (!ISO_DATO.test(streng)) return false;
  const [år, måned, dag] = streng.split("-").map(Number);
  const dato = new Date(Date.UTC(år, måned - 1, dag));
  return (
    dato.getUTCFullYear() === år && dato.getUTCMonth() === måned - 1 && dato.getUTCDate() === dag
  );
}

const gyldigDato = (verdi: string | null) => (verdi && erGyldigDato(verdi) ? verdi : null);

function lagStandardPeriode() {
  const nå = new Date();
  const iso = (dato: Date) => dato.toISOString().slice(0, 10);
  return {
    fra: iso(new Date(nå.getFullYear(), nå.getMonth(), 1)),
    til: iso(new Date(nå.getFullYear(), nå.getMonth() + 1, 0)),
  };
}

function lagPeriode(url: URL) {
  const standard = lagStandardPeriode();
  if (url.searchParams.get("periode") === "year") {
    const år = new Date().getFullYear();
    return { fra: `${år}-01-01`, til: `${år}-12-31` };
  }
  return {
    fra: gyldigDato(url.searchParams.get("fra")) ?? standard.fra,
    til: gyldigDato(url.searchParams.get("til")) ?? standard.til,
  };
}

export async function loader({ request }: { request: Request }) {
  const bruker = await hentInnloggetBruker({ request });
  const url = new URL(request.url);
  const periode = lagPeriode(url);
  const omfang =
    url.searchParams.get("omfang") ?? (bruker.enhetId ? `enhet:${bruker.enhetId}` : "meg");
  const nivaa =
    omfang === "organisasjon"
      ? "nav-kontroll"
      : omfang === "enhet:hovedavdeling"
        ? "hovedavdeling"
        : omfang.startsWith("enhet:")
          ? "underavdeling"
          : "meg";
  const valgtEnhetId = omfang.startsWith("enhet:") ? omfang.slice("enhet:".length) : undefined;
  const spørring: StatistikkSpørring = {
    nivaa,
    fra: periode.fra,
    til: periode.til,
    enhetId:
      nivaa === "underavdeling" || nivaa === "hovedavdeling"
        ? valgtEnhetId && !["underavdeling", "hovedavdeling"].includes(valgtEnhetId)
          ? valgtEnhetId
          : (bruker.enhetId ?? undefined)
        : undefined,
  };
  const data = skalBrukeMockdata
    ? lagMockStatistikk(spørring, bruker.enhet, bruker.enhetId)
    : await hentStatistikk(await getBackendOboToken(request), spørring);
  return { data, spørring, bruker };
}
