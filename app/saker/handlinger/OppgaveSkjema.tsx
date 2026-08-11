import type { FieldMetadata } from "@conform-to/react";
import { useInputControl } from "@conform-to/react";
import {
  DatePicker,
  Select,
  Textarea,
  UNSAFE_Combobox,
  VStack,
  useDatepicker,
} from "@navikt/ds-react";
import { formaterTilIsoDato } from "~/utils/date-utils";
import { behandlendeEnheter } from "./behandlendeEnheter";

const oppgavetypeValg = [
  { verdi: "VUR", label: "Vurder dokument" },
  { verdi: "VURD_HENV", label: "Vurder henvendelse" },
  { verdi: "VUR_KONS_YTE", label: "Vurder konsekvens for ytelse" },
] as const;

interface OppgaveSkjemaProps {
  fields: {
    oppgavetype: FieldMetadata<string | undefined>;
    prioritet: FieldMetadata<string | undefined>;
    frist: FieldMetadata<string | undefined>;
    behandlendeEnhet: FieldMetadata<string | undefined>;
    beskrivelse: FieldMetadata<string | undefined>;
  };
}

export function OppgaveSkjema({ fields }: OppgaveSkjemaProps) {
  const frist = useInputControl(fields.frist);
  const behandlendeEnhet = useInputControl(fields.behandlendeEnhet);

  const { datepickerProps, inputProps } = useDatepicker({
    fromDate: new Date(),
    onDateChange: (date) => {
      frist.change(date ? formaterTilIsoDato(date) : "");
    },
  });

  const valgtBehandlendeEnhet = behandlendeEnheter.find(
    (enhet) => enhet.value === behandlendeEnhet.value,
  );

  return (
    <VStack gap="space-4">
      <Select
        key={fields.oppgavetype.key}
        name={fields.oppgavetype.name}
        id={fields.oppgavetype.id}
        defaultValue={fields.oppgavetype.initialValue ?? ""}
        label="Oppgavetype"
        error={fields.oppgavetype.errors?.[0]}
      >
        <option value="">Velg oppgavetype</option>
        {oppgavetypeValg.map(({ verdi, label }) => (
          <option key={verdi} value={verdi}>
            {label}
          </option>
        ))}
      </Select>

      <div className="grid grid-cols-2 gap-x-4">
        <Select
          key={fields.prioritet.key}
          name={fields.prioritet.name}
          id={fields.prioritet.id}
          defaultValue={fields.prioritet.initialValue ?? ""}
          label="Prioritet"
          error={fields.prioritet.errors?.[0]}
        >
          <option value="">Velg prioritet</option>
          <option value="LAV">Lav</option>
          <option value="NORMAL">Normal</option>
          <option value="HOY">Høy</option>
        </Select>

        <input
          name={fields.frist.name}
          defaultValue={fields.frist.initialValue}
          hidden
          tabIndex={-1}
          onFocus={() => frist.focus()}
        />
        <DatePicker {...datepickerProps}>
          <DatePicker.Input {...inputProps} label="Frist" error={fields.frist.errors?.[0]} />
        </DatePicker>
      </div>

      <input
        name={fields.behandlendeEnhet.name}
        defaultValue={fields.behandlendeEnhet.initialValue}
        hidden
        tabIndex={-1}
        onFocus={() => behandlendeEnhet.focus()}
      />
      <UNSAFE_Combobox
        label="Behandlende enhet"
        options={behandlendeEnheter}
        placeholder="Søk etter enhet"
        selectedOptions={valgtBehandlendeEnhet ? [valgtBehandlendeEnhet] : []}
        onToggleSelected={(enhetsnummer, isSelected) =>
          behandlendeEnhet.change(isSelected ? enhetsnummer : "")
        }
        error={fields.behandlendeEnhet.errors?.[0]}
      />

      <Textarea
        key={fields.beskrivelse.key}
        name={fields.beskrivelse.name}
        defaultValue={fields.beskrivelse.initialValue}
        label="Beskrivelse"
        error={fields.beskrivelse.errors?.[0]}
        minRows={2}
        maxRows={5}
      />
    </VStack>
  );
}
