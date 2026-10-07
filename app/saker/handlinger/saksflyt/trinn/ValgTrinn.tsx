import {
  BodyLong,
  Checkbox,
  CheckboxGroup,
  Detail,
  Radio,
  RadioGroup,
  UNSAFE_Combobox,
  VStack,
} from "@navikt/ds-react";
import type { KontrollsakStatus, TillatteHandlingerResponse } from "~/saker/types.backend";
import { formaterStatus } from "~/saker/visning";
import { finnSkjemafelt, hentValg, INGEN_STATUS, type Trinn, type Verdier } from "../saksflyt";
import { type Feil, sjekkpunktNavn } from "../validering";

type TrinnProps<T extends Trinn["type"]> = {
  trinn: Extract<Trinn, { type: T }>;
  verdier: Verdier;
  feil: Feil;
  onChange: (navn: string, verdi: string) => void;
  tillatteHandlinger: TillatteHandlingerResponse;
};

export function SjekklisteTrinn({ trinn, verdier, feil, onChange }: TrinnProps<"sjekkliste">) {
  const valgte = trinn.punkter
    .map((_, indeks) => sjekkpunktNavn(indeks))
    .filter((navn) => verdier[navn] === "true");
  return (
    <VStack gap="space-16">
      <BodyLong>{trinn.ingress}</BodyLong>
      <CheckboxGroup
        legend="Handlinger"
        hideLegend
        description={trinn.beskrivelse}
        value={valgte}
        error={feil.sjekkliste}
        onChange={(nyeValg: string[]) => {
          trinn.punkter.forEach((_, indeks) => {
            const navn = sjekkpunktNavn(indeks);
            const valgt = nyeValg.includes(navn);
            if (valgt !== (verdier[navn] === "true")) onChange(navn, String(valgt));
          });
        }}
      >
        {trinn.punkter.map((punkt, indeks) => (
          <Checkbox key={punkt} value={sjekkpunktNavn(indeks)}>
            {punkt}
          </Checkbox>
        ))}
      </CheckboxGroup>
    </VStack>
  );
}

function Legend({ children }: { children: string }) {
  return (
    <Detail as="span" uppercase weight="semibold" textColor="subtle">
      {children}
    </Detail>
  );
}

/** Flere valg enn dette vises som en søkbar combobox i stedet for radioknapper. */
const MAKS_ANTALL_RADIOKNAPPER = 8;

export function EnkeltvalgTrinn({
  trinn,
  verdier,
  feil,
  onChange,
  tillatteHandlinger,
}: TrinnProps<"enkeltvalg">) {
  const felt = finnSkjemafelt(tillatteHandlinger.feltskjema, trinn.felt);
  const valg = felt
    ? hentValg(felt, tillatteHandlinger.tillatteResultater, trinn.tillatteVerdier)
    : [];
  const valgt = verdier[trinn.felt] ?? "";
  if (valg.length > MAKS_ANTALL_RADIOKNAPPER) {
    const valgtAlternativ = valg.find((alternativ) => alternativ.verdi === valgt);
    return (
      <UNSAFE_Combobox
        label={<Legend>{trinn.legend}</Legend>}
        description={trinn.beskrivelse}
        options={valg.map((alternativ) => ({ value: alternativ.verdi, label: alternativ.etikett }))}
        selectedOptions={
          valgtAlternativ ? [{ value: valgtAlternativ.verdi, label: valgtAlternativ.etikett }] : []
        }
        error={feil[trinn.felt]}
        onToggleSelected={(verdi, erValgt) => onChange(trinn.felt, erValgt ? verdi : "")}
      />
    );
  }
  return (
    <RadioGroup
      legend={<Legend>{trinn.legend}</Legend>}
      description={trinn.beskrivelse}
      value={valgt}
      error={feil[trinn.felt]}
      onChange={(verdi: string) => onChange(trinn.felt, verdi)}
    >
      {valg.map((alternativ) => (
        <Radio key={alternativ.verdi} value={alternativ.verdi}>
          {alternativ.etikett}
        </Radio>
      ))}
    </RadioGroup>
  );
}

function statusetikett(status: KontrollsakStatus | null, iBero: boolean): string {
  if (status !== null) return formaterStatus(status);
  return iBero ? "Gjenoppta" : "Aktiv";
}

export function StatusTrinn({ verdier, feil, onChange, tillatteHandlinger }: TrinnProps<"status">) {
  const iBero = tillatteHandlinger.tilstand.status === "I_BERO";
  return (
    <RadioGroup
      legend={<Legend>Status</Legend>}
      description="Tilgjengelige statuser for dette steget"
      value={verdier.status ?? ""}
      error={feil.status}
      onChange={(verdi: string) => onChange("status", verdi)}
    >
      {tillatteHandlinger.tillatteStatuser.map((status) => (
        <Radio key={status ?? INGEN_STATUS} value={status ?? INGEN_STATUS}>
          {statusetikett(status, iBero)}
        </Radio>
      ))}
    </RadioGroup>
  );
}
