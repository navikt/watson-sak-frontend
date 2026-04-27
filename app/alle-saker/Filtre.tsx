// Filterpanel for Alle saker-siden.
// På xl+ vises filtrene som en vertikal kolonne til høyre for tabellen.
// På mindre skjermer vises de horisontalt med wrapping over tabellen.

import { Chips, Label, UNSAFE_Combobox } from "@navikt/ds-react";
import { useSearchParams } from "react-router";

type FilterAlternativer = {
  enhet: string[];
  saksbehandler: string[];
  kategori: string[];
  misbrukstype: string[];
  merking: string[];
};

type AktivtFilter = FilterAlternativer;

interface Props {
  alternativer: FilterAlternativer;
  aktivtFilter: AktivtFilter;
}

const CHIPS_GRUPPER: Array<{
  heading: string;
  paramKey: Exclude<keyof FilterAlternativer, "saksbehandler">;
}> = [
  { heading: "Enhet", paramKey: "enhet" },
  { heading: "Kategori", paramKey: "kategori" },
  { heading: "Misbrukstype", paramKey: "misbrukstype" },
  { heading: "Merking", paramKey: "merking" },
];

export function Filtre({ alternativer, aktivtFilter }: Props) {
  const [, setSearchParams] = useSearchParams();

  function toggleFilterverdi(key: keyof FilterAlternativer, verdi: string) {
    setSearchParams((forrige) => {
      const neste = new URLSearchParams(forrige);
      const gjeldende = forrige.getAll(key);
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
      neste.delete("side");
      return neste;
    });
  }

  const harAlternativer =
    alternativer.saksbehandler.length > 0 ||
    CHIPS_GRUPPER.some(({ paramKey }) => alternativer[paramKey].length > 0);

  if (!harAlternativer) return null;

  return (
    <div className="flex flex-wrap gap-6 xl:flex-col xl:flex-nowrap xl:gap-5">
      {/* Saksbehandler-filter: combobox med multi-select, alltid øverst */}
      {alternativer.saksbehandler.length > 0 && (
        <div className="min-w-48 xl:min-w-0">
          <UNSAFE_Combobox
            label="Saksbehandler"
            size="small"
            placeholder="Søk etter saksbehandler"
            options={alternativer.saksbehandler}
            selectedOptions={aktivtFilter.saksbehandler}
            isMultiSelect
            onToggleSelected={(verdi) => toggleFilterverdi("saksbehandler", verdi)}
          />
        </div>
      )}

      {/* Øvrige filtre: chips per gruppe */}
      {CHIPS_GRUPPER.filter(({ paramKey }) => alternativer[paramKey].length > 0).map(
        ({ heading, paramKey }) => (
          <div key={paramKey}>
            <Label as="p" size="small" spacing>
              {heading}
            </Label>
            <Chips size="small">
              {alternativer[paramKey].map((alt) => (
                <Chips.Toggle
                  key={alt}
                  selected={aktivtFilter[paramKey].includes(alt)}
                  onClick={() => toggleFilterverdi(paramKey, alt)}
                >
                  {alt}
                </Chips.Toggle>
              ))}
            </Chips>
          </div>
        ),
      )}
    </div>
  );
}
