import { UNSAFE_Combobox } from "@navikt/ds-react";
import { useSearchParams } from "react-router";
import { ChipsFiltergruppe } from "~/filtre/ChipsFiltergruppe";
import { Filterpanel } from "~/filtre/Filterpanel";
import { useFilterParam } from "~/filtre/useFilterParam";
import { parseMultiValueParam } from "~/filtre/parseMultiValueParam";

type SaksbehandlerAlternativ = {
  label: string;
  value: string;
};

type KodeAlternativ = {
  label: string;
  value: string;
};

type MisbrukstypeAlternativ = {
  label: string;
  value: string;
  kategori: string;
};

type FilterAlternativer = {
  enhet: KodeAlternativ[];
  saksbehandler: SaksbehandlerAlternativ[];
  kategori: KodeAlternativ[];
  misbrukstype: MisbrukstypeAlternativ[];
  merking: string[];
  status: KodeAlternativ[];
};

interface Props {
  alternativer: FilterAlternativer;
}

const RESET_KEYS = ["side"];

export function Filtre({ alternativer }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();
  const valgtSaksbehandler = searchParams.get("saksbehandler") ?? "";
  const valgteKategorier = parseMultiValueParam(searchParams, "kategori");

  const filtrerteMisbrukstyper =
    valgteKategorier.length === 0
      ? alternativer.misbrukstype
      : alternativer.misbrukstype.filter((m) => valgteKategorier.includes(m.kategori));

  function velgSaksbehandler(verdi: string, erValgt: boolean) {
    setSearchParams((forrige) => {
      const neste = new URLSearchParams(forrige);
      neste.delete("side");
      if (erValgt) {
        neste.set("saksbehandler", verdi);
      } else {
        neste.delete("saksbehandler");
      }
      return neste;
    });
  }

  function toggleKategori(verdi: string) {
    setSearchParams((forrige) => {
      const neste = new URLSearchParams(forrige);
      const gjeldende = parseMultiValueParam(forrige, "kategori");

      const oppdaterteKategorier = gjeldende.includes(verdi)
        ? gjeldende.filter((v) => v !== verdi)
        : [...gjeldende, verdi];

      neste.delete("kategori");
      for (const k of oppdaterteKategorier) neste.append("kategori", k);

      // Fjern misbrukstyper som ikke lenger tilhører noen valgt kategori.
      // Når ingen kategorier er valgt, fjernes alle misbrukstype-filtre.
      const gyldige = new Set(
        alternativer.misbrukstype
          .filter((m) => oppdaterteKategorier.includes(m.kategori))
          .map((m) => m.value),
      );
      const gjeldendeMisbrukstyper = parseMultiValueParam(forrige, "misbrukstype");
      neste.delete("misbrukstype");
      for (const m of gjeldendeMisbrukstyper.filter((m) => gyldige.has(m))) {
        neste.append("misbrukstype", m);
      }

      for (const key of RESET_KEYS) neste.delete(key);
      return neste;
    });
  }

  const harAlternativer =
    alternativer.saksbehandler.length > 0 ||
    alternativer.enhet.length > 0 ||
    alternativer.kategori.length > 0 ||
    alternativer.misbrukstype.length > 0 ||
    alternativer.merking.length > 0 ||
    alternativer.status.length > 0;

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
            selectedOptions={alternativer.saksbehandler.filter(
              (sb) => sb.value === valgtSaksbehandler,
            )}
            isMultiSelect={false}
            onToggleSelected={velgSaksbehandler}
          />
        </div>
      )}

      {alternativer.enhet.length > 0 && (
        <ChipsFiltergruppeForKodeAlternativ
          tittel="Enhet"
          paramKey="enhet"
          alternativer={alternativer.enhet}
        />
      )}

      {alternativer.kategori.length > 0 && (
        <ChipsFiltergruppe
          tittel="Kategori"
          alternativer={alternativer.kategori.map((alt) => ({
            verdi: alt.value,
            etikett: alt.label,
          }))}
          valgteVerdier={valgteKategorier}
          onToggle={toggleKategori}
          size="small"
        />
      )}

      {filtrerteMisbrukstyper.length > 0 && (
        <ChipsFiltergruppeForKodeAlternativ
          tittel="Misbrukstype"
          paramKey="misbrukstype"
          alternativer={filtrerteMisbrukstyper}
        />
      )}

      {alternativer.merking.length > 0 && (
        <ChipsFiltergruppeForParam
          tittel="Merking"
          paramKey="merking"
          alternativer={alternativer.merking}
        />
      )}

      {alternativer.status.length > 0 && (
        <ChipsFiltergruppeForKodeAlternativ
          tittel="Status"
          paramKey="status"
          alternativer={alternativer.status}
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
