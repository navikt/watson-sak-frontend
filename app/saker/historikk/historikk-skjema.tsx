import {
  type FieldMetadata,
  getInputProps,
  getTextareaProps,
  useInputControl,
} from "@conform-to/react";
import {
  DatePicker,
  ErrorMessage,
  HStack,
  Textarea,
  TextField,
  useDatepicker,
  VStack,
} from "@navikt/ds-react";
import { z } from "zod";

export function parseDato(dato: string): Date | null {
  const deler = dato.split(".");
  if (deler.length !== 3) return null;
  const [dag, måned, år] = deler.map(Number);
  const d = new Date(år, måned - 1, dag);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formaterDato(date: Date): string {
  const dag = String(date.getDate()).padStart(2, "0");
  const måned = String(date.getMonth() + 1).padStart(2, "0");
  const år = date.getFullYear();
  return `${dag}.${måned}.${år}`;
}

export function formaterTid(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export const historikkSkjema = z
  .object({
    tittel: z.string({ error: "Tittel er påkrevd" }).min(1, "Tittel er påkrevd"),
    notat: z.string().max(500, "Maks 500 tegn").optional(),
    dato: z.string({ error: "Dato er påkrevd" }).min(1, "Dato er påkrevd"),
    tid: z.string({ error: "Klokkeslett er påkrevd" }).min(1, "Klokkeslett er påkrevd"),
  })
  .refine(
    ({ dato, tid }) => {
      const d = parseDato(dato);
      if (!d) return true;
      const [timer, minutter] = tid.split(":").map(Number);
      d.setHours(timer, minutter, 0, 0);
      return d <= new Date();
    },
    { message: "Tidspunktet kan ikke være i fremtiden", path: ["tid"] },
  );

interface HistorikkSkjemaFelterProps {
  fields: {
    tittel: FieldMetadata<string>;
    notat: FieldMetadata<string | undefined>;
    dato: FieldMetadata<string>;
    tid: FieldMetadata<string>;
  };
  defaultSelected: Date;
  onDatoChange: (dato: string) => void;
}

export function HistorikkSkjemaFelter({
  fields,
  defaultSelected,
  onDatoChange,
}: HistorikkSkjemaFelterProps) {
  const dato = useInputControl(fields.dato);

  const { datepickerProps, inputProps } = useDatepicker({
    defaultSelected,
    toDate: new Date(),
    onDateChange: (val) => {
      if (!val) return;
      const formatted = formaterDato(val);
      dato.change(formatted);
      onDatoChange(formatted);
    },
  });

  return (
    <VStack gap="space-4">
      <TextField
        {...getInputProps(fields.tittel, { type: "text" })}
        label="Tittel"
        autoComplete="off"
        error={fields.tittel.errors?.[0]}
      />
      <Textarea
        {...getTextareaProps(fields.notat)}
        label="Beskrivelse"
        maxLength={500}
        error={fields.notat.errors?.[0]}
      />
      <input
        name={fields.dato.name}
        defaultValue={fields.dato.initialValue}
        hidden
        tabIndex={-1}
        onFocus={() => dato.focus()}
      />
      <fieldset>
        <DatePicker {...datepickerProps}>
          <HStack gap="space-4" align="end">
            <DatePicker.Input
              {...inputProps}
              label="Dato"
              value={dato.value ?? ""}
              onChange={(e) => {
                inputProps.onChange?.(e);
                dato.change(e.target.value);
              }}
            />
            <TextField {...getInputProps(fields.tid, { type: "time" })} label="Klokkeslett" />
          </HStack>
        </DatePicker>
        {(fields.dato.errors?.[0] || fields.tid.errors?.[0]) && (
          <ErrorMessage size="small" className="mt-1">
            {fields.dato.errors?.[0] || fields.tid.errors?.[0]}
          </ErrorMessage>
        )}
      </fieldset>
    </VStack>
  );
}
