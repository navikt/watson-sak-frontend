import { Heading, VStack } from "@navikt/ds-react";
import { useMemo } from "react";
import { useSearchParams } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { ChipsFiltergruppe } from "~/filtre/ChipsFiltergruppe";
import { Filterpanel } from "~/filtre/Filterpanel";
import type {
  Blokkeringsarsak,
  KontrollsakResponse,
  KontrollsakStatus,
} from "~/saker/types.backend";
import { mapKontrollsakTilSakslisteRad } from "~/saker/saksliste/adaptere";
import { AntallTreffEtikett } from "~/saker/saksliste/AntallTreffEtikett";
import { Saksliste } from "~/saker/saksliste/Saksliste";
import { RouteConfig } from "~/routeConfig";
import {
  type AlleSakerKolonne,
  type Sorteringsretning,
  sorterSaker,
  sorteringskolonner,
} from "~/alle-saker/saker-utils";
import { DeltMedMegSeksjon } from "./DeltMedMegSeksjon";

const STANDARD_KOLONNE: AlleSakerKolonne = "opprettet";
const STANDARD_RETNING: Sorteringsretning = "desc";

type FilterAlternativ = {
  verdi: string;
  etikett: string;
};

type Props = {
  saker: KontrollsakResponse[];
  deltMedSaker: KontrollsakResponse[];
  detaljSti: string;
  filterAlternativer: {
    status: FilterAlternativ[];
    ventestatus: FilterAlternativ[];
  };
  aktivtFilter: {
    status: KontrollsakStatus[];
    ventestatus: (Blokkeringsarsak | "INGEN")[];
  };
};

export function MineSakerInnhold({
  saker,
  deltMedSaker,
  detaljSti,
  filterAlternativer,
  aktivtFilter,
}: Props) {
  const [searchParams, setSearchParams] = useSearchParams();

  const sorteringskolonne = parseKolonne(searchParams.get("sorter"));
  const sorteringsretning = parseRetning(searchParams.get("retning"));

  const sorterteSaker = useMemo(
    () => sorterSaker(saker, sorteringskolonne, sorteringsretning),
    [saker, sorteringskolonne, sorteringsretning],
  );

  const harAktiveFiltre = aktivtFilter.status.length > 0 || aktivtFilter.ventestatus.length > 0;
  const tomTekst = harAktiveFiltre ? "Endre filtrering for å finne saker" : "Du har ingen saker.";

  function toggleFilter(key: "status" | "ventestatus", verdi: string) {
    const filtergruppe = key === "ventestatus" ? "arbeidsstatus" : key;
    sporHendelse("filter brukt", { filtergruppe, side: "mine-saker" });
    setSearchParams((forrige) => {
      const neste = new URLSearchParams(forrige);

      const gjeldende = neste.getAll(key);
      neste.delete(key);

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
      return neste;
    });
  }

  return (
    <section aria-labelledby="mine-saker-overskrift" className="pb-12">
      <VStack gap="space-12" className="mt-4 mb-8">
        <Heading id="mine-saker-overskrift" level="1" size="large">
          Mine saker
        </Heading>

        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:gap-8">
          <div className="min-w-0 flex-1 xl:order-first">
            <AntallTreffEtikett antall={sorterteSaker.length} />
            <Saksliste
              rader={sorterteSaker.map((sak) => mapKontrollsakTilSakslisteRad(sak, detaljSti))}
              tomTekst={tomTekst}
              tilbake={{ to: RouteConfig.MINE_SAKER, label: "Mine saker" }}
              sortering={{
                kolonne: sorteringskolonne,
                retning: sorteringsretning === "asc" ? "stigende" : "synkende",
                onSort: (kolonne) => sorterPåKolonne(kolonne as AlleSakerKolonne),
                sorterbare: [...sorteringskolonner],
              }}
            />
          </div>

          <div
            role="group"
            aria-label="Filtrer saker"
            className="xl:order-last xl:w-56 xl:shrink-0"
          >
            <Filterpanel>
              <ChipsFiltergruppe
                tittel="Status"
                alternativer={filterAlternativer.status}
                valgteVerdier={aktivtFilter.status}
                onToggle={(verdi) => toggleFilter("status", verdi)}
                size="small"
              />
              <ChipsFiltergruppe
                tittel="Arbeidsstatus"
                alternativer={filterAlternativer.ventestatus}
                valgteVerdier={aktivtFilter.ventestatus}
                onToggle={(verdi) => toggleFilter("ventestatus", verdi)}
                size="small"
              />
            </Filterpanel>
          </div>
        </div>
      </VStack>
      <DeltMedMegSeksjon saker={deltMedSaker} detaljSti={detaljSti} />
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
