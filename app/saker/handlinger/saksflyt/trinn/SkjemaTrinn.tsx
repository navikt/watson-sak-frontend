import {
  DatePicker,
  Radio,
  RadioGroup,
  Textarea,
  TextField,
  useDatepicker,
  VStack,
} from "@navikt/ds-react";
import { Beløpsfelt } from "~/formaterte-inputfelt/FormaterteInputfelt";
import type { TillatteHandlingerResponse } from "~/saker/types.backend";
import { formaterYtelseType } from "~/saker/visning";
import { formaterTilIsoDato } from "~/utils/date-utils";
import { resultatFeltErPaakrevd } from "../../resultat-request";
import { erBelopsfelt, type Trinn, type Verdier, ytelseVerdiNavn } from "../saksflyt";
import { type Feil, hentSynligeFelter } from "../validering";

type Skjemafelt = TillatteHandlingerResponse["feltskjema"][number];

type FeltProps = {
  felt: Skjemafelt;
  verdier: Verdier;
  feil: Feil;
  onChange: (navn: string, verdi: string) => void;
};

function Datofelt({ felt, verdier, feil, onChange }: FeltProps) {
  const lagret = verdier[felt.felt];
  const { datepickerProps, inputProps } = useDatepicker({
    toDate: new Date(),
    defaultSelected: lagret ? new Date(`${lagret}T12:00:00`) : undefined,
    onDateChange: (dato) => onChange(felt.felt, dato ? formaterTilIsoDato(dato) : ""),
  });
  return (
    <DatePicker {...datepickerProps}>
      <DatePicker.Input {...inputProps} label={felt.etikett} error={feil[felt.felt]} />
    </DatePicker>
  );
}

function Resultatfelt({
  felt,
  verdier,
  feil,
  onChange,
  tillatteVerdier,
}: FeltProps & { tillatteVerdier?: readonly string[] }) {
  const verdi = verdier[felt.felt] ?? "";
  const valgfri = !resultatFeltErPaakrevd(felt, verdier);
  const etikett = valgfri ? `${felt.etikett} (valgfritt)` : felt.etikett;

  switch (felt.datatype) {
    case "enum":
      return (
        <RadioGroup
          legend={etikett}
          value={verdi}
          error={feil[felt.felt]}
          onChange={(nyVerdi: string) => onChange(felt.felt, nyVerdi)}
        >
          {felt.verdier
            .filter((valg) => !tillatteVerdier || tillatteVerdier.includes(valg.verdi))
            .map((valg) => (
              <Radio key={valg.verdi} value={valg.verdi}>
                {valg.etikett}
              </Radio>
            ))}
        </RadioGroup>
      );
    case "boolsk":
      return (
        <RadioGroup
          legend={etikett}
          value={verdi}
          error={feil[felt.felt]}
          onChange={(nyVerdi: string) => onChange(felt.felt, nyVerdi)}
        >
          <Radio value="true">Ja</Radio>
          <Radio value="false">Nei</Radio>
        </RadioGroup>
      );
    case "tekst":
      return (
        <Textarea
          label={etikett}
          value={verdi}
          error={feil[felt.felt]}
          minRows={2}
          maxRows={6}
          onChange={(event) => onChange(felt.felt, event.target.value)}
        />
      );
    case "tall":
      return (
        <TextField
          label={etikett}
          value={verdi}
          error={feil[felt.felt]}
          inputMode="decimal"
          onChange={(event) => onChange(felt.felt, event.target.value)}
        />
      );
    case "dato":
      return <Datofelt felt={felt} verdier={verdier} feil={feil} onChange={onChange} />;
    default:
      return null;
  }
}

function Belopsfelter({
  felt,
  belopEtikett,
  verdier,
  feil,
  onChange,
  ytelser,
}: FeltProps & {
  belopEtikett: string;
  ytelser: TillatteHandlingerResponse["tilstand"]["ytelser"];
}) {
  return ytelser.map((ytelse) => {
    const navn = ytelseVerdiNavn(ytelse.id, felt.felt);
    const ledetekst =
      ytelser.length > 1
        ? `${belopEtikett} - ${formaterYtelseType(ytelse.type)} (kr)`
        : `${belopEtikett} (kr)`;
    return (
      <Beløpsfelt
        key={navn}
        label={ledetekst}
        value={verdier[navn] ?? ""}
        error={feil[navn]}
        onChange={(verdi) => onChange(navn, verdi)}
      />
    );
  });
}

export function SkjemaTrinn({
  trinn,
  verdier,
  feil,
  onChange,
  tillatteHandlinger,
}: {
  trinn: Extract<Trinn, { type: "skjema" }>;
  verdier: Verdier;
  feil: Feil;
  onChange: (navn: string, verdi: string) => void;
  tillatteHandlinger: TillatteHandlingerResponse;
}) {
  const felter = hentSynligeFelter(trinn, verdier, tillatteHandlinger.feltskjema);
  return (
    <VStack gap="space-20">
      {felter.map((felt) =>
        erBelopsfelt(felt.felt) ? (
          <Belopsfelter
            key={felt.felt}
            felt={felt}
            belopEtikett={trinn.belopEtikett ?? felt.etikett}
            verdier={verdier}
            feil={feil}
            onChange={onChange}
            ytelser={tillatteHandlinger.tilstand.ytelser}
          />
        ) : (
          <Resultatfelt
            key={felt.felt}
            felt={felt}
            verdier={verdier}
            feil={feil}
            onChange={onChange}
            tillatteVerdier={trinn.tillatteVerdier?.[felt.felt]}
          />
        ),
      )}
    </VStack>
  );
}
