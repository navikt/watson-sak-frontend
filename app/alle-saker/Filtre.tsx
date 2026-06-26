import { UNSAFE_Combobox } from "@navikt/ds-react";
import { ChipsFiltergruppe } from "~/filtre/ChipsFiltergruppe";
import { Filterpanel } from "~/filtre/Filterpanel";
import { useFilterParam } from "~/filtre/useFilterParam";

type SaksbehandlerAlternativ = {
  label: string;
  value: string;
};

type KodeAlternativ = {
  label: string;
  value: string;
};

type FilterAlternativer = {
  enhet: string[];
  saksbehandler: SaksbehandlerAlternativ[];
  kategori: KodeAlternativ[];
  misbrukstype: KodeAlternativ[];
  merking: string[];
};

interface Props {
  alternativer: FilterAlternativer;
}

const RESET_KEYS = ["side"];

export function Filtre({ alternativer }: Props) {
  const saksbehandlerFilter = useFilterParam("saksbehandler", { resetKeys: RESET_KEYS });

  const harAlternativer =
    alternativer.saksbehandler.length > 0 ||
    alternativer.enhet.length > 0 ||
    alternativer.kategori.length > 0 ||
    alternativer.misbrukstype.length > 0 ||
    alternativer.merking.length > 0;

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
            isMultiSelect={false}
            onToggleSelected={(verdi, erValgt) => {
              if (erValgt) {
                saksbehandlerFilter.toggle(verdi);
              } else if (saksbehandlerFilter.valgteVerdier.includes(verdi)) {
                saksbehandlerFilter.toggle(verdi);
              }
            }}
          />
        </div>
      )}

      {alternativer.enhet.length > 0 && (
        <ChipsFiltergruppeForParam
          tittel="Enhet"
          paramKey="enhet"
          alternativer={alternativer.enhet}
        />
      )}

      {alternativer.kategori.length > 0 && (
        <ChipsFiltergruppeForKodeAlternativ
          tittel="Kategori"
          paramKey="kategori"
          alternativer={alternativer.kategori}
        />
      )}

      {alternativer.misbrukstype.length > 0 && (
        <ChipsFiltergruppeForKodeAlternativ
          tittel="Misbrukstype"
          paramKey="misbrukstype"
          alternativer={alternativer.misbrukstype}
        />
      )}

      {alternativer.merking.length > 0 && (
        <ChipsFiltergruppeForParam
          tittel="Merking"
          paramKey="merking"
          alternativer={alternativer.merking}
        />
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

function ChipsFiltergruppeForKodeAlternativ({
  tittel,
  paramKey,
  alternativer,
}: {
  tittel: string;
  paramKey: string;
  alternativer: KodeAlternativ[];
}) {
  const { valgteVerdier, toggle } = useFilterParam(paramKey, { resetKeys: RESET_KEYS });

  return (
    <ChipsFiltergruppe
      tittel={tittel}
      alternativer={alternativer.map((alt) => ({ verdi: alt.value, etikett: alt.label }))}
      valgteVerdier={valgteVerdier}
      onToggle={toggle}
      size="small"
    />
  );
}
