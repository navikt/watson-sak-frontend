import { UNSAFE_Combobox } from "@navikt/ds-react";
import { ChipsFiltergruppe } from "~/filtre/ChipsFiltergruppe";
import { Filterpanel } from "~/filtre/Filterpanel";
import { useFilterParam } from "~/filtre/useFilterParam";

type FilterAlternativer = {
  enhet: string[];
  saksbehandler: string[];
  kategori: string[];
  misbrukstype: string[];
  merking: string[];
};

interface Props {
  alternativer: FilterAlternativer;
}

const RESET_KEYS = ["side"];

const CHIPS_GRUPPER: Array<{
  heading: string;
  paramKey: Exclude<keyof FilterAlternativer, "saksbehandler">;
}> = [
  { heading: "Enhet", paramKey: "enhet" },
  { heading: "Kategori", paramKey: "kategori" },
  { heading: "Misbrukstype", paramKey: "misbrukstype" },
  { heading: "Merking", paramKey: "merking" },
];

export function Filtre({ alternativer }: Props) {
  const saksbehandlerFilter = useFilterParam("saksbehandler", { resetKeys: RESET_KEYS });

  const harAlternativer =
    alternativer.saksbehandler.length > 0 ||
    CHIPS_GRUPPER.some(({ paramKey }) => alternativer[paramKey].length > 0);

  if (!harAlternativer) return null;

  return (
    <Filterpanel>
      {alternativer.saksbehandler.length > 0 && (
        <div className="min-w-48 xl:min-w-0">
          <UNSAFE_Combobox
            label="Saksbehandler"
            size="small"
            placeholder="Søk etter saksbehandler"
            options={alternativer.saksbehandler}
            selectedOptions={saksbehandlerFilter.valgteVerdier}
            isMultiSelect
            onToggleSelected={saksbehandlerFilter.toggle}
          />
        </div>
      )}

      {CHIPS_GRUPPER.filter(({ paramKey }) => alternativer[paramKey].length > 0).map(
        ({ heading, paramKey }) => (
          <ChipsFiltergruppeForParam
            key={paramKey}
            tittel={heading}
            paramKey={paramKey}
            alternativer={alternativer[paramKey]}
          />
        ),
      )}
    </Filterpanel>
  );
}

function ChipsFiltergruppeForParam({
  tittel,
  paramKey,
  alternativer,
}: {
  tittel: string;
  paramKey: string;
  alternativer: string[];
}) {
  const { valgteVerdier, toggle } = useFilterParam(paramKey, { resetKeys: RESET_KEYS });

  return (
    <ChipsFiltergruppe
      tittel={tittel}
      alternativer={alternativer.map((alt) => ({ verdi: alt, etikett: alt }))}
      valgteVerdier={valgteVerdier}
      onToggle={toggle}
      size="small"
    />
  );
}
