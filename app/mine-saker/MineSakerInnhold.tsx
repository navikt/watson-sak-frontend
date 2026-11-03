import { Heading, HStack, Pagination, Tabs, VStack } from "@navikt/ds-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { BackendUtilgjengeligMelding } from "~/komponenter/BackendUtilgjengeligMelding";
import { sporHendelse } from "~/analytics/analytics";
import { ChipsFiltergruppe } from "~/filtre/ChipsFiltergruppe";
import { Filterpanel } from "~/filtre/Filterpanel";
import type {
  KontrollsakResponse,
  KontrollsakStatus,
  KontrollsakSteg,
} from "~/saker/types.backend";
import { mapKontrollsakTilSakslisteRad } from "~/saker/saksliste/adaptere";
import { AntallTreffEtikett } from "~/saker/saksliste/AntallTreffEtikett";
import { Saksliste } from "~/saker/saksliste/Saksliste";
import { RouteConfig } from "~/routeConfig";
import { filtrerMineSaker } from "./filtre";
import { ANTALL_PER_SIDE, paginerElementer } from "~/utils/paginering";
import {
  type AlleSakerKolonne,
  type Sorteringsretning,
  sorterSaker,
  sorteringskolonner,
} from "~/alle-saker/saker-utils";

const STANDARD_KOLONNE: AlleSakerKolonne = "opprettet";
const STANDARD_RETNING: Sorteringsretning = "desc";

type Fane = "mine" | "delt";

type FilterAlternativ = {
  verdi: string;
  etikett: string;
};

type Props = {
  saker: KontrollsakResponse[];
  deltMedSaker: KontrollsakResponse[];
  detaljSti: string;
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
  saker,
  deltMedSaker,
  detaljSti,
  filterAlternativer,
  aktivtFilter,
  saksdataUtilgjengelig = false,
}: Props) {
  const [searchParams, setSearchParams] = useSearchParams();

  const sorteringskolonne = parseKolonne(searchParams.get("sorter"));
  const sorteringsretning = parseRetning(searchParams.get("retning"));

  function gåTilSide(side: number) {
    setSearchParams((forrige) => {
      const neste = new URLSearchParams(forrige);
      neste.set("side", String(side));
      return neste;
    });
  }

  const harDeltFane = deltMedSaker.length > 0;
  const aktivFane: Fane = harDeltFane && searchParams.get("fane") === "delt" ? "delt" : "mine";

  // Mine saker er filtrert i loaderen. Delte saker hentes ufiltrert og filtreres her med samme regler.
  const filtrerteDeltSaker = useMemo(
    () => filtrerMineSaker(deltMedSaker, aktivtFilter.steg, aktivtFilter.status),
    [deltMedSaker, aktivtFilter.steg, aktivtFilter.status],
  );
  const aktiveSaker = aktivFane === "delt" ? filtrerteDeltSaker : saker;

  const sorterteSaker = useMemo(
    () => sorterSaker(aktiveSaker, sorteringskolonne, sorteringsretning),
    [aktiveSaker, sorteringskolonne, sorteringsretning],
  );

  const valgtSide = Number.parseInt(searchParams.get("side") ?? "1", 10) || 1;
  const paginerteSaker = useMemo(
    () => paginerElementer(sorterteSaker, valgtSide, ANTALL_PER_SIDE),
    [sorterteSaker, valgtSide],
  );

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

  const harAktiveFiltre = aktivtFilter.steg.length > 0 || aktivtFilter.status.length > 0;
  const tomTekst = harAktiveFiltre
    ? "Endre filtrering for å finne saker"
    : aktivFane === "delt"
      ? "Ingen saker er delt med deg."
      : "Du har ingen saker.";
  const tilbakeMål =
    aktivFane === "delt"
      ? { to: `${RouteConfig.MINE_SAKER}?fane=delt`, label: "Delt med meg" }
      : { to: RouteConfig.MINE_SAKER, label: "Mine saker" };

  function toggleFilter(key: "steg" | "status", verdi: string) {
    sporHendelse("filter brukt", { filtergruppe: key, side: "mine-saker" });
    setSearchParams((forrige) => {
      const neste = new URLSearchParams(forrige);

      const gjeldende = neste.getAll(key);
      neste.delete(key);
      neste.delete("side");

      if (gjeldende.includes(verdi)) {
        for (const v of gjeldende.filter((v) => v !== verdi)) {
          neste.append(key, v);
        }
      } else {
        for (const v of [...gjeldende, verdi]) {
          neste.append(key, v);
        }
      }
      return neste;
    });
  }

  function sorterPåKolonne(kolonne: AlleSakerKolonne) {
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

  const mineSaker = (
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:gap-8">
      <div className="min-w-0 flex-1 xl:order-first">
        <AntallTreffEtikett antall={sorterteSaker.length} />
        <div className="overflow-x-auto [&_table]:w-full">
          <Saksliste
            rader={paginerteSaker.elementer.map((sak) =>
              mapKontrollsakTilSakslisteRad(sak, detaljSti),
            )}
            tomTekst={tomTekst}
            tilbake={tilbakeMål}
            sortering={{
              kolonne: sorteringskolonne,
              retning: sorteringsretning === "asc" ? "stigende" : "synkende",
              onSort: (kolonne) => sorterPåKolonne(kolonne as AlleSakerKolonne),
              sorterbare: [...sorteringskolonner],
            }}
          />
        </div>
        {paginerteSaker.totalSider > 1 && (
          <HStack justify="center" className="mt-6">
            <Pagination
              page={paginerteSaker.aktivSide}
              onPageChange={gåTilSide}
              count={paginerteSaker.totalSider}
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

  return (
    <section aria-labelledby="mine-saker-overskrift" className="pb-12">
      <VStack gap="space-12" className="mt-4 mb-8">
        <Heading id="mine-saker-overskrift" level="1" size="large">
          Mine saker
        </Heading>

        {saksdataUtilgjengelig ? (
          <BackendUtilgjengeligMelding />
        ) : harDeltFane ? (
          <Tabs value={aktivFane} onChange={byttFane}>
            <Tabs.List>
              <Tabs.Tab value="mine" label={`Mine saker (${saker.length})`} />
              <Tabs.Tab value="delt" label={`Delt med meg (${filtrerteDeltSaker.length})`} />
            </Tabs.List>
            <Tabs.Panel value="mine" className="pt-4">
              {aktivFane === "mine" && mineSaker}
            </Tabs.Panel>
            <Tabs.Panel value="delt" className="pt-4">
              {aktivFane === "delt" && mineSaker}
            </Tabs.Panel>
          </Tabs>
        ) : (
          mineSaker
        )}
      </VStack>
    </section>
  );
}

function parseKolonne(verdi: string | null): AlleSakerKolonne {
  return sorteringskolonner.includes(verdi as AlleSakerKolonne)
    ? (verdi as AlleSakerKolonne)
    : STANDARD_KOLONNE;
}

function parseRetning(verdi: string | null): Sorteringsretning {
  return verdi === "asc" || verdi === "desc" ? verdi : STANDARD_RETNING;
}

function standardRetningForKolonne(kolonne: AlleSakerKolonne): Sorteringsretning {
  return kolonne === "opprettet" || kolonne === "oppdatert" ? "desc" : "asc";
}
