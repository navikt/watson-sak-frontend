import {
  Button,
  DatePicker,
  HStack,
  TextField,
  UNSAFE_Combobox,
  useRangeDatepicker,
} from "@navikt/ds-react";
import { TrashIcon } from "@navikt/aksel-icons";
import { useMemo, useState } from "react";
import { lagRegistrerSakDatepickerValg } from "./registrerSakDatepicker";
import type { YtelseRadVerdier } from "./skjema-helpers";

type Feil = Partial<Record<string, string[]>>;

export function førsteFeilForFelt(feil: Feil | undefined, felt: string): string | undefined {
  return feil?.[felt]?.[0];
}

export function ankerIdForFelt(felt: string): string {
  return `felt-${felt.replace(/[^\p{L}\p{N}]+/gu, "-")}`;
}

type FeilElement = { id: string; melding: string };

export function samleFeilElementer(feil: Feil | undefined): FeilElement[] {
  if (!feil) return [];
  const elementer: FeilElement[] = [];
  for (const [felt, meldinger] of Object.entries(feil)) {
    if (!meldinger || meldinger.length === 0) continue;
    if (felt === "skjema") continue;
    elementer.push({ id: ankerIdForFelt(felt), melding: meldinger[0] });
  }
  return elementer;
}

function parseTilDate(verdi: string | undefined): Date | undefined {
  if (!verdi) return undefined;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(verdi);
  if (iso) {
    const dato = new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])));
    return Number.isNaN(dato.getTime()) ? undefined : dato;
  }
  const norsk = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(verdi);
  if (norsk) {
    const dato = new Date(Date.UTC(Number(norsk[3]), Number(norsk[2]) - 1, Number(norsk[1])));
    return Number.isNaN(dato.getTime()) ? undefined : dato;
  }
  return undefined;
}

type YtelseRadFeltProps = {
  indeks: number;
  ytelser: readonly string[];
  kanFjernes: boolean;
  onFjern: () => void;
  defaults: YtelseRadVerdier;
  feil: Feil | undefined;
  size?: "medium" | "small";
};

export function YtelseRadFelt({
  indeks,
  ytelser,
  kanFjernes,
  onFjern,
  defaults,
  feil,
  size = "medium",
}: YtelseRadFeltProps) {
  const [valgtYtelse, setValgtYtelse] = useState<string>(defaults.type ?? "");
  const registrerSakDatepickerValg = useMemo(() => lagRegistrerSakDatepickerValg(new Date()), []);
  const defaultRange = useMemo(
    () => ({
      from: parseTilDate(defaults.fraDato),
      to: parseTilDate(defaults.tilDato),
    }),
    [defaults.fraDato, defaults.tilDato],
  );
  const { datepickerProps, fromInputProps, toInputProps } = useRangeDatepicker({
    ...registrerSakDatepickerValg,
    defaultSelected: defaultRange,
  });

  const ytelseFeltnavn = `ytelser[${indeks}].type`;
  const fraFeltnavn = `ytelser[${indeks}].fraDato`;
  const tilFeltnavn = `ytelser[${indeks}].tilDato`;
  const beløpFeltnavn = `ytelser[${indeks}].beløp`;

  const ytelseFeil = førsteFeilForFelt(feil, `ytelser.${indeks}.type`);
  const fraFeil = førsteFeilForFelt(feil, `ytelser.${indeks}.fraDato`);
  const tilFeil = førsteFeilForFelt(feil, `ytelser.${indeks}.tilDato`);
  const beløpFeil = førsteFeilForFelt(feil, `ytelser.${indeks}.beløp`);

  return (
    <HStack gap="space-16" align="end" wrap>
      <div id={ankerIdForFelt(`ytelser.${indeks}.type`)} className="w-56">
        <UNSAFE_Combobox
          label="Ytelse"
          size={size}
          options={ytelser as string[]}
          selectedOptions={valgtYtelse ? [valgtYtelse] : []}
          onToggleSelected={(option, isSelected) => setValgtYtelse(isSelected ? option : "")}
          error={ytelseFeil}
        />
      </div>
      {valgtYtelse && <input type="hidden" name={ytelseFeltnavn} value={valgtYtelse} />}

      <DatePicker {...datepickerProps} dropdownCaption={registrerSakDatepickerValg.dropdownCaption}>
        <HStack gap="space-16" align="end" wrap>
          <DatePicker.Input
            {...fromInputProps}
            id={ankerIdForFelt(`ytelser.${indeks}.fraDato`)}
            name={fraFeltnavn}
            label="Fra"
            size={size}
            error={fraFeil}
          />
          <DatePicker.Input
            {...toInputProps}
            id={ankerIdForFelt(`ytelser.${indeks}.tilDato`)}
            name={tilFeltnavn}
            label="Til"
            size={size}
            error={tilFeil}
          />
        </HStack>
      </DatePicker>

      <TextField
        id={ankerIdForFelt(`ytelser.${indeks}.beløp`)}
        name={beløpFeltnavn}
        label="Ca beløp"
        size={size}
        inputMode="numeric"
        htmlSize={12}
        autoComplete="off"
        defaultValue={defaults.beløp ?? ""}
        error={beløpFeil}
      />

      <Button
        type="button"
        variant="tertiary"
        size="small"
        icon={<TrashIcon aria-hidden />}
        onClick={onFjern}
        disabled={!kanFjernes}
        title={kanFjernes ? "Fjern rad" : "Det må være minst én rad"}
        className="mb-2"
      >
        <span className="sr-only">Fjern rad {indeks + 1}</span>
      </Button>
    </HStack>
  );
}
