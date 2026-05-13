import { FolderIcon } from "@navikt/aksel-icons";
import { Heading, HStack } from "@navikt/ds-react";
import { useSearchParams } from "react-router";
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
      <HStack gap="space-4" align="center" className="mt-6 mb-6">
        <FolderIcon aria-hidden fontSize="1.25rem" className="text-ax-text-neutral" />
        <Heading id="mine-saker-overskrift" level="1" size="medium">
          Mine saker
        </Heading>
      </HStack>

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
