import { Heading, VStack } from "@navikt/ds-react";
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
import { Saksliste } from "~/saker/saksliste/Saksliste";
import { DEFAULT_STATUSER, DEFAULT_VENTESTATUSER } from "./filtre";

type FilterAlternativ = {
  verdi: string;
  etikett: string;
};

type Props = {
  saker: KontrollsakResponse[];
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

export function MineSakerInnhold({ saker, detaljSti, filterAlternativer, aktivtFilter }: Props) {
  const [, setSearchParams] = useSearchParams();

  // Mine saker har en spesiell default-initialiseringslogikk:
  // Første toggle seeder begge filtergrupper med standardverdier.
  function toggleFilter(key: "status" | "ventestatus", verdi: string) {
    sporHendelse("filter brukt", { filtergruppe: key, side: "mine-saker" });
    setSearchParams((forrige) => {
      const neste = new URLSearchParams(forrige);

      if (!forrige.has("status") && !forrige.has("ventestatus")) {
        for (const s of DEFAULT_STATUSER) neste.append("status", s);
        for (const v of DEFAULT_VENTESTATUSER) neste.append("ventestatus", v);
      }

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

  return (
    <section aria-labelledby="mine-saker-overskrift" className="pb-12">
      <VStack gap="space-12" className="mt-4 mb-8">
        <Heading id="mine-saker-overskrift" level="1" size="large">
          Mine saker
        </Heading>
      </VStack>

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:gap-8">
        <div className="min-w-0 flex-1 xl:order-first">
          <Saksliste
            rader={saker.map((sak) => mapKontrollsakTilSakslisteRad(sak, detaljSti))}
            tomTekst="Ingen saker matcher valgte filtre."
          />
        </div>

        <div role="group" aria-label="Filtrer saker" className="xl:order-last xl:w-56 xl:shrink-0">
          <Filterpanel>
            <ChipsFiltergruppe
              tittel="Status"
              alternativer={filterAlternativer.status}
              valgteVerdier={aktivtFilter.status}
              onToggle={(verdi) => toggleFilter("status", verdi)}
              size="small"
            />
            <ChipsFiltergruppe
              tittel="Ventestatus"
              alternativer={filterAlternativer.ventestatus}
              valgteVerdier={aktivtFilter.ventestatus}
              onToggle={(verdi) => toggleFilter("ventestatus", verdi)}
              size="small"
            />
          </Filterpanel>
        </div>
      </div>
    </section>
  );
}
