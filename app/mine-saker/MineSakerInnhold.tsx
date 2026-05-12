import { FolderIcon } from "@navikt/aksel-icons";
import { Chips, Heading, HStack, Label } from "@navikt/ds-react";
import { useSearchParams } from "react-router";
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

  function toggleFilter(key: "status" | "ventestatus", verdi: string) {
    setSearchParams((forrige) => {
      const neste = new URLSearchParams(forrige);

      // Hvis vi ikke har noen filterparams ennå, initialiser med defaults
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

      {/* Responsiv layout: filtre over tabellen på small, til høyre på xl+ */}
      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:gap-8">
        {/* Tabell */}
        <div className="min-w-0 flex-1 xl:order-first">
          <Saksliste
            rader={saker.map((sak) => mapKontrollsakTilSakslisteRad(sak, detaljSti))}
            tomTekst="Ingen saker matcher valgte filtre."
          />
        </div>

        {/* Filterpanel: horisontalt over tabellen på small, vertikal kolonne til høyre på xl+ */}
        <div role="group" aria-label="Filtrer saker" className="xl:order-last xl:w-56 xl:shrink-0">
          <div className="flex flex-wrap gap-6 xl:flex-col xl:flex-nowrap xl:gap-5">
            <div>
              <Label as="p" size="small" spacing>
                Status
              </Label>
              <Chips size="small">
                {filterAlternativer.status.map((alt) => (
                  <Chips.Toggle
                    key={alt.verdi}
                    selected={aktivtFilter.status.includes(alt.verdi as KontrollsakStatus)}
                    onClick={() => toggleFilter("status", alt.verdi)}
                  >
                    {alt.etikett}
                  </Chips.Toggle>
                ))}
              </Chips>
            </div>

            <div>
              <Label as="p" size="small" spacing>
                Ventestatus
              </Label>
              <Chips size="small">
                {filterAlternativer.ventestatus.map((alt) => (
                  <Chips.Toggle
                    key={alt.verdi}
                    selected={aktivtFilter.ventestatus.includes(
                      alt.verdi as Blokkeringsarsak | "INGEN",
                    )}
                    onClick={() => toggleFilter("ventestatus", alt.verdi)}
                  >
                    {alt.etikett}
                  </Chips.Toggle>
                ))}
              </Chips>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
