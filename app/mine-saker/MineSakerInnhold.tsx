import { Heading, HStack, Pagination, Tabs, VStack } from "@navikt/ds-react";
import { useSearchParams } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { BackendUtilgjengeligMelding } from "~/komponenter/BackendUtilgjengeligMelding";
import { ChipsFiltergruppe } from "~/filtre/ChipsFiltergruppe";
import { Filterpanel } from "~/filtre/Filterpanel";
import { RouteConfig } from "~/routeConfig";
import type { SakslisteRad } from "~/saker/saksliste/Saksliste";
import { AntallTreffEtikett } from "~/saker/saksliste/AntallTreffEtikett";
import { Saksliste } from "~/saker/saksliste/Saksliste";
import { SORTERBARE_SAKSKOLONNER, standardRetningForKolonne } from "~/saker/saksliste/oppsett";
import type { KontrollsakStatus, KontrollsakSteg } from "~/saker/types.backend";
import type { Sorteringsretning } from "~/alle-saker/saker-utils";

type Fane = "mine" | "delt";
type Sorteringskolonne = "saksid" | "kategori" | "steg" | "status" | "opprettet" | "oppdatert";

const MINE_KOLONNER = [
  "saksid",
  "navn",
  "kategori",
  "misbrukstype",
  "steg",
  "status",
  "opprettet",
  "oppdatert",
] as const;
const DELTE_KOLONNER = [...MINE_KOLONNER, "saksbehandler"] as const;

type FilterAlternativ = {
  verdi: string;
  etikett: string;
};

type Props = {
  rader: SakslisteRad[];
  aktivFane: Fane;
  aktivSide: number;
  totalAntall: number;
  totalSider: number;
  antallMineSaker: number;
  antallDelteSaker: number;
  sorteringskolonne: Sorteringskolonne;
  sorteringsretning: Sorteringsretning;
  filterAlternativer: {
    steg: FilterAlternativ[];
    status: FilterAlternativ[];
  };
  aktivtFilter: {
    steg: KontrollsakSteg[];
    status: (KontrollsakStatus | "INGEN")[];
  };
  saksdataUtilgjengelig?: boolean;
};

export function MineSakerInnhold({
  rader,
  aktivFane,
  aktivSide,
  totalAntall,
  totalSider,
  antallMineSaker,
  antallDelteSaker,
  sorteringskolonne,
  sorteringsretning,
  filterAlternativer,
  aktivtFilter,
  saksdataUtilgjengelig = false,
}: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const harAktiveFiltre = aktivtFilter.steg.length > 0 || aktivtFilter.status.length > 0;
  const tomTekst = harAktiveFiltre
    ? "Endre filtrering for å finne saker"
    : aktivFane === "delt"
      ? "Ingen saker er delt med deg."
      : "Du har ingen saker.";

  function gåTilSide(side: number) {
    setSearchParams((forrige) => {
      const neste = new URLSearchParams(forrige);
      neste.set("side", String(side));
      return neste;
    });
  }

  function byttFane(verdi: string) {
    setSearchParams((forrige) => {
      const neste = new URLSearchParams(forrige);
      neste.delete("side");
      if (verdi === "delt") {
        neste.set("fane", "delt");
      } else {
        neste.delete("fane");
      }
      return neste;
    });
  }

  function toggleFilter(key: "steg" | "status", verdi: string) {
    sporHendelse("filter brukt", { filtergruppe: key, side: "mine-saker" });
    setSearchParams((forrige) => {
      const neste = new URLSearchParams(forrige);

      // Ta utgangspunkt i aktivt filter, ikke URL-en, så standardfilteret
      // (alle steg unntatt avsluttet) blir med når brukeren endrer det.
      const gjeldende: string[] = aktivtFilter[key];
      neste.delete("steg");
      neste.delete("status");
      for (const v of aktivtFilter.steg) neste.append("steg", v);
      for (const v of aktivtFilter.status) neste.append("status", v);
      neste.delete(key);
      neste.delete("side");

      const oppdaterte = gjeldende.includes(verdi)
        ? gjeldende.filter((v) => v !== verdi)
        : [...gjeldende, verdi];
      for (const v of oppdaterte) neste.append(key, v);
      return neste;
    });
  }

  function sorterPåKolonne(kolonne: Sorteringskolonne) {
    setSearchParams((forrige) => {
      const neste = new URLSearchParams(forrige);
      const nesteRetning: Sorteringsretning =
        sorteringskolonne === kolonne
          ? sorteringsretning === "asc"
            ? "desc"
            : "asc"
          : standardRetningForKolonne(kolonne);
      neste.set("sorter", kolonne);
      neste.set("retning", nesteRetning);
      neste.delete("side");
      return neste;
    });
  }

  function visSaksliste(fane: Fane) {
    const tilbakeParams = new URLSearchParams(searchParams);
    tilbakeParams.delete("side");
    if (fane === "delt") {
      tilbakeParams.set("fane", "delt");
    } else {
      tilbakeParams.delete("fane");
    }
    const tilbakeSøk = tilbakeParams.toString();
    const tilbakeSti = `${RouteConfig.MINE_SAKER}${tilbakeSøk ? `?${tilbakeSøk}` : ""}`;

    return (
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:gap-8">
        <div className="min-w-0 flex-1 xl:order-first">
          <AntallTreffEtikett antall={totalAntall} />
          <div className="overflow-x-auto [&_table]:w-full">
            <Saksliste
              rader={rader}
              kolonner={fane === "delt" ? [...DELTE_KOLONNER] : [...MINE_KOLONNER]}
              tomTekst={tomTekst}
              tilbake={{
                to: tilbakeSti,
                label: fane === "delt" ? "Delt med meg" : "Mine saker",
              }}
              sortering={{
                kolonne: sorteringskolonne,
                retning: sorteringsretning === "asc" ? "stigende" : "synkende",
                onSort: (kolonne) => {
                  if (erSorterbarKolonne(kolonne)) sorterPåKolonne(kolonne);
                },
                sorterbare: [...SORTERBARE_SAKSKOLONNER],
              }}
            />
          </div>
          {totalSider > 1 && (
            <HStack justify="center" className="mt-6">
              <Pagination
                page={aktivSide}
                onPageChange={gåTilSide}
                count={totalSider}
                size="small"
              />
            </HStack>
          )}
        </div>

        <div role="group" aria-label="Filtrer saker" className="xl:order-last xl:w-56 xl:shrink-0">
          <Filterpanel>
            <ChipsFiltergruppe
              tittel="Steg"
              alternativer={filterAlternativer.steg}
              valgteVerdier={aktivtFilter.steg}
              onToggle={(verdi) => toggleFilter("steg", verdi)}
              size="small"
            />
            <ChipsFiltergruppe
              tittel="Status"
              alternativer={filterAlternativer.status}
              valgteVerdier={aktivtFilter.status}
              onToggle={(verdi) => toggleFilter("status", verdi)}
              size="small"
            />
          </Filterpanel>
        </div>
      </div>
    );
  }

  return (
    <section aria-labelledby="mine-saker-overskrift" className="pb-12">
      <VStack gap="space-12" className="mt-4 mb-8">
        <Heading id="mine-saker-overskrift" level="1" size="large">
          Mine saker
        </Heading>

        {saksdataUtilgjengelig ? (
          <BackendUtilgjengeligMelding />
        ) : (
          <Tabs value={aktivFane} onChange={byttFane}>
            <Tabs.List>
              <Tabs.Tab value="mine" label={`Mine saker (${antallMineSaker})`} />
              <Tabs.Tab value="delt" label={`Delt med meg (${antallDelteSaker})`} />
            </Tabs.List>
            <Tabs.Panel value="mine" className="pt-4">
              {aktivFane === "mine" && visSaksliste("mine")}
            </Tabs.Panel>
            <Tabs.Panel value="delt" className="pt-4">
              {aktivFane === "delt" && visSaksliste("delt")}
            </Tabs.Panel>
          </Tabs>
        )}
      </VStack>
    </section>
  );
}

function erSorterbarKolonne(kolonne: string): kolonne is Sorteringskolonne {
  return SORTERBARE_SAKSKOLONNER.includes(kolonne as Sorteringskolonne);
}
