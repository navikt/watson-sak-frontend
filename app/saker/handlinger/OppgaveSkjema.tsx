import type { FieldMetadata } from "@conform-to/react";
import { useInputControl } from "@conform-to/react";
import { useEffect } from "react";
import {
  BodyShort,
  Button,
  DatePicker,
  Select,
  Textarea,
  UNSAFE_Combobox,
  VStack,
  useDatepicker,
} from "@navikt/ds-react";
import { formaterTilIsoDato } from "~/utils/date-utils";
import { behandlendeEnheter } from "./behandlendeEnheter";
import { gjelderverdiPåkrevdFelt } from "./oppgavefelt";
import { prioritetValg } from "./opprett-formatering";
import type { OppgavekodeverkTilstand } from "./useOppgavekodeverk";

interface OppgaveSkjemaProps {
  fields: {
    oppgavetype: FieldMetadata<string | undefined>;
    prioritet: FieldMetadata<string | undefined>;
    frist: FieldMetadata<string | undefined>;
    behandlendeEnhet: FieldMetadata<string | undefined>;
    gjelderverdi: FieldMetadata<string | undefined>;
    beskrivelse: FieldMetadata<string | undefined>;
  };
  /** Oppgavetyper og gjelderverdier for valgt tema. */
  kodeverk: OppgavekodeverkTilstand;
  onPrøvIgjen: () => void;
}

const kodeverkBeskrivelse: Record<Exclude<OppgavekodeverkTilstand["status"], "ok">, string> = {
  "uten-tema": "Velg tema først",
  laster: "Henter valg fra Gosys …",
  feil: "Kunne ikke hente valg fra Gosys",
  utlogget: "Sesjonen din er utløpt",
};

export function OppgaveSkjema({ fields, kodeverk, onPrøvIgjen }: OppgaveSkjemaProps) {
  const frist = useInputControl(fields.frist);
  const behandlendeEnhet = useInputControl(fields.behandlendeEnhet);
  const gjelderverdi = useInputControl(fields.gjelderverdi);

  const { datepickerProps, inputProps } = useDatepicker({
    fromDate: new Date(),
    onDateChange: (date) => {
      frist.change(date ? formaterTilIsoDato(date) : "");
    },
  });

  const valgtBehandlendeEnhet = behandlendeEnheter.find(
    (enhet) => enhet.value === behandlendeEnhet.value,
  );
  const oppgavetyper = kodeverk.status === "ok" ? kodeverk.kodeverk.oppgavetyper : [];
  const gjelderverdier =
    kodeverk.status === "ok"
      ? kodeverk.kodeverk.gjelderverdier.map(({ behandlingstema, behandlingstemaTerm }) => ({
          label: behandlingstemaTerm,
          value: behandlingstema,
        }))
      : [];
  const valgtGjelderverdi = gjelderverdier.find((valg) => valg.value === gjelderverdi.value);
  // Noen temaer, som Kontroll anmeldelse, har ingen gjelderverdier i Gosys. Da skjules feltet.
  const utenGjelderverdier = kodeverk.status === "ok" && gjelderverdier.length === 0;
  const kodeverkHjelpetekst =
    kodeverk.status === "ok" ? undefined : kodeverkBeskrivelse[kodeverk.status];

  // Gjelderverdiene avhenger av tema. Et valg fra et annet tema skal ikke sendes med.
  const ugyldigGjelderverdi =
    kodeverk.status === "ok" && Boolean(gjelderverdi.value) && !valgtGjelderverdi;
  useEffect(() => {
    if (ugyldigGjelderverdi) gjelderverdi.change("");
  }, [ugyldigGjelderverdi, gjelderverdi]);

  return (
    <VStack gap="space-12">
      {kodeverk.status === "utlogget" && (
        <BodyShort size="small">
          Sesjonen din er utløpt. Last inn siden på nytt for å logge inn.
        </BodyShort>
      )}
      {kodeverk.status === "feil" && (
        <VStack gap="space-8" align="start">
          <BodyShort size="small">
            Kunne ikke hente oppgavetyper og gjelderverdier fra Gosys.
          </BodyShort>
          <Button type="button" size="small" variant="secondary" onClick={onPrøvIgjen}>
            Prøv igjen
          </Button>
        </VStack>
      )}
      <Select
        key={fields.oppgavetype.key}
        name={fields.oppgavetype.name}
        id={fields.oppgavetype.id}
        defaultValue={fields.oppgavetype.initialValue ?? ""}
        label="Oppgavetype"
        description={kodeverkHjelpetekst}
        disabled={kodeverk.status !== "ok"}
        error={fields.oppgavetype.errors?.[0]}
      >
        <option value="">Velg oppgavetype</option>
        {oppgavetyper.map(({ oppgavetype, term }) => (
          <option key={oppgavetype} value={oppgavetype}>
            {term}
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
          {prioritetValg.map(({ verdi, label }) => (
            <option key={verdi} value={verdi}>
              {label}
            </option>
          ))}
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

      <input
        type="hidden"
        name={gjelderverdiPåkrevdFelt}
        value={utenGjelderverdier ? "nei" : "ja"}
      />
      <input
        name={fields.gjelderverdi.name}
        defaultValue={fields.gjelderverdi.initialValue}
        hidden
        tabIndex={-1}
        onFocus={() => gjelderverdi.focus()}
      />
      {!utenGjelderverdier && (
        <UNSAFE_Combobox
          label="Gjelderverdi"
          description={kodeverkHjelpetekst}
          disabled={kodeverk.status !== "ok"}
          options={gjelderverdier}
          placeholder="Velg gjelderverdi"
          selectedOptions={valgtGjelderverdi ? [valgtGjelderverdi] : []}
          onToggleSelected={(verdi, isSelected) => gjelderverdi.change(isSelected ? verdi : "")}
          error={fields.gjelderverdi.errors?.[0]}
        />
      )}

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
