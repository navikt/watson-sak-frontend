import {
  BodyShort,
  DatePicker,
  Fieldset,
  Heading,
  HGrid,
  HStack,
  Radio,
  RadioGroup,
  Select,
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
import {
  erBelopsfelt,
  feltgrupper,
  feltvisning,
  finnSkjemafelt,
  hentValg,
  type Trinn,
  type Verdier,
  ytelseVerdiNavn,
} from "../saksflyt";
import { type Feil, hentSynligeFelter } from "../validering";

type Skjemafelt = TillatteHandlingerResponse["feltskjema"][number];

const domfellelseVenstre = [
  "politi.ubetingetFengselMaaneder",
  "politi.ubetingetFengselDager",
  "politi.betingetFengselMaaneder",
  "politi.betingetFengselDager",
  "politi.samfunnsstraffTimer",
  "politi.tilstaaelsesdom",
];
const domfellelseHoyre = [
  "politi.siviltRettskrav",
  "politi.bot",
  "politi.domfeltBelop",
  "politi.medvirker",
];
const domfellelseEtter = ["politi.strafferabattLiggetid", "politi.emkBrudd"];

function erPolitiresultatfelt(felt: Skjemafelt): boolean {
  return felt.felt.startsWith("politi.") || felt.felt === "paaklaget";
}

function etikettMedStatus(felt: Skjemafelt, valgfri: boolean): string {
  if (erPolitiresultatfelt(felt)) return valgfri ? felt.etikett : `${felt.etikett} (påkrevd)`;
  return valgfri ? `${felt.etikett} (valgfritt)` : felt.etikett;
}

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
      <DatePicker.Input
        {...inputProps}
        label={etikettMedStatus(felt, !resultatFeltErPaakrevd(felt, verdier))}
        error={feil[felt.felt]}
      />
    </DatePicker>
  );
}

type Enhetsfelt = { felt: Skjemafelt; enhet: string };

const enhetsnavn: Readonly<Record<string, string>> = {
  mnd: "måneder",
  dag: "dager",
  timer: "timer",
  kr: "kroner",
};

/** Enheten vises bare visuelt, så skjermlesere får den i feltnavnet hvis etiketten mangler den. */
function tilgjengeligEtikett(etikett: string, enhet: string): string {
  const navn = enhetsnavn[enhet] ?? enhet;
  return etikett.toLowerCase().includes(navn) ? etikett : `${etikett} (${navn})`;
}

/** Smale felt med enheten til høyre, for eksempel «[ ] mnd [ ] dag» eller «[ ] kr». */
function Enhetsfelter({
  legend,
  felter,
  verdier,
  feil,
  onChange,
}: Omit<FeltProps, "felt"> & { legend: string; felter: readonly Enhetsfelt[] }) {
  const feilmelding = felter.map(({ felt }) => feil[felt.felt]).find(Boolean);
  return (
    <Fieldset legend={legend} error={feilmelding}>
      <HStack gap="space-16" align="center">
        {felter.map(({ felt, enhet }) => {
          const felles = {
            label: tilgjengeligEtikett(felt.etikett, enhet),
            hideLabel: true,
            value: verdier[felt.felt] ?? "",
          };
          return (
            <HStack key={felt.felt} gap="space-8" align="center" wrap={false}>
              {felt.datatype === "belop" ? (
                <Beløpsfelt
                  {...felles}
                  htmlSize={10}
                  onChange={(nyVerdi) => onChange(felt.felt, nyVerdi)}
                />
              ) : (
                <TextField
                  {...felles}
                  htmlSize={enhet === "timer" ? 6 : 4}
                  inputMode="numeric"
                  autoComplete="off"
                  onChange={(event) => onChange(felt.felt, event.target.value)}
                />
              )}
              <BodyShort aria-hidden>{enhet}</BodyShort>
            </HStack>
          );
        })}
      </HStack>
    </Fieldset>
  );
}

function Resultatfelt({
  felt,
  verdier,
  feil,
  onChange,
  tillatteVerdier,
  tillatteResultater,
}: FeltProps & { tillatteVerdier?: readonly string[]; tillatteResultater: readonly string[] }) {
  const verdi = verdier[felt.felt] ?? "";
  const valgfri = !resultatFeltErPaakrevd(felt, verdier);
  const etikett = etikettMedStatus(felt, valgfri);
  const visning = feltvisning[felt.felt] ?? {};

  if (visning.enhet) {
    return (
      <Enhetsfelter
        legend={etikett}
        felter={[{ felt, enhet: visning.enhet }]}
        verdier={verdier}
        feil={feil}
        onChange={onChange}
      />
    );
  }

  if (visning.valg) {
    return (
      <Select
        label={etikett}
        description={visning.beskrivelse}
        value={verdi}
        error={feil[felt.felt]}
        onChange={(event) => onChange(felt.felt, event.target.value)}
      >
        <option value="">Velg politidistrikt</option>
        {visning.valg.map((valg) => (
          <option key={valg} value={valg}>
            {valg}
          </option>
        ))}
      </Select>
    );
  }

  switch (felt.datatype) {
    case "enum":
      return (
        <RadioGroup
          legend={etikett}
          description={visning.beskrivelse}
          value={verdi}
          error={feil[felt.felt]}
          onChange={(nyVerdi: string) => onChange(felt.felt, nyVerdi)}
        >
          {hentValg(felt, tillatteResultater, tillatteVerdier).map((valg) => (
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
          description={visning.beskrivelse}
          value={verdi}
          error={feil[felt.felt]}
          onChange={(nyVerdi: string) => onChange(felt.felt, nyVerdi)}
        >
          <HStack gap="space-24" wrap={false}>
            <Radio value="true">Ja</Radio>
            <Radio value="false">Nei</Radio>
          </HStack>
        </RadioGroup>
      );
    case "tekst": {
      if (visning.maksLengde !== undefined) {
        return (
          <TextField
            label={etikett}
            description={visning.beskrivelse}
            value={verdi}
            error={feil[felt.felt]}
            autoComplete="off"
            onChange={(event) => onChange(felt.felt, event.target.value)}
          />
        );
      }
      return (
        <Textarea
          label={etikett}
          description={visning.beskrivelse}
          value={verdi}
          error={feil[felt.felt]}
          minRows={2}
          maxRows={6}
          onChange={(event) => onChange(felt.felt, event.target.value)}
        />
      );
    }
    case "tall":
    case "heltall":
      return (
        <TextField
          label={etikett}
          value={verdi}
          error={feil[felt.felt]}
          description={visning.beskrivelse}
          inputMode={felt.datatype === "heltall" ? "numeric" : "decimal"}
          onChange={(event) => onChange(felt.felt, event.target.value)}
        />
      );
    case "dato":
      return <Datofelt felt={felt} verdier={verdier} feil={feil} onChange={onChange} />;
    case "belop":
      return (
        <Beløpsfelt
          label={
            erPolitiresultatfelt(felt)
              ? `${etikett} (kr)`
              : `${felt.etikett} (kr)${valgfri ? " (valgfritt)" : ""}`
          }
          value={verdi}
          error={feil[felt.felt]}
          onChange={(nyVerdi) => onChange(felt.felt, nyVerdi)}
        />
      );
    default:
      return null;
  }
}

function Belopsfelter({
  felt,
  belopEtikett,
  valgfritt,
  verdier,
  feil,
  onChange,
  ytelser,
}: FeltProps & {
  belopEtikett: string;
  valgfritt: boolean;
  ytelser: TillatteHandlingerResponse["tilstand"]["ytelser"];
}) {
  const tillegg = valgfritt ? " (valgfritt)" : "";
  return ytelser.map((ytelse) => {
    const navn = ytelseVerdiNavn(ytelse.id, felt.felt);
    const ledetekst =
      ytelser.length > 1
        ? `${belopEtikett} - ${formaterYtelseType(ytelse.type)} (kr)${tillegg}`
        : `${belopEtikett} (kr)${tillegg}`;
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
  const { feltskjema } = tillatteHandlinger;
  const felter = hentSynligeFelter(trinn, verdier, feltskjema);
  const synlige = new Map(felter.map((felt) => [felt.felt, felt]));
  const gruppert = new Set(Object.values(feltgrupper).flatMap((gruppe) => gruppe.felter));
  const undertittel = trinn.undertittelFelt
    ? finnSkjemafelt(feltskjema, trinn.undertittelFelt)?.verdier.find(
        (valg) => valg.verdi === verdier[trinn.undertittelFelt ?? ""],
      )?.etikett
    : undefined;

  function visFelt(felt: Skjemafelt) {
    const gruppe = feltgrupper[felt.felt];
    if (gruppe) {
      const medlemmer = gruppe.felter.flatMap((navn) => {
        const medlem = synlige.get(navn);
        return medlem ? [{ felt: medlem, enhet: feltvisning[navn]?.enhet ?? "" }] : [];
      });
      const valgfri = medlemmer.every(({ felt }) => !resultatFeltErPaakrevd(felt, verdier));
      const etikett =
        valgfri && medlemmer[0]?.felt.felt.startsWith("politi.")
          ? gruppe.legend
          : valgfri
            ? `${gruppe.legend} (valgfritt)`
            : gruppe.legend;
      return (
        <Enhetsfelter
          key={felt.felt}
          legend={etikett}
          felter={medlemmer}
          verdier={verdier}
          feil={feil}
          onChange={onChange}
        />
      );
    }
    if (gruppert.has(felt.felt)) return null;
    if (erBelopsfelt(felt.felt)) {
      return (
        <Belopsfelter
          key={felt.felt}
          felt={felt}
          belopEtikett={trinn.belopEtikett ?? felt.etikett}
          valgfritt={trinn.belopValgfritt === true}
          verdier={verdier}
          feil={feil}
          onChange={onChange}
          ytelser={tillatteHandlinger.tilstand.ytelser}
        />
      );
    }
    return (
      <Resultatfelt
        key={felt.felt}
        felt={felt}
        verdier={verdier}
        feil={feil}
        onChange={onChange}
        tillatteVerdier={trinn.tillatteVerdier?.[felt.felt]}
        tillatteResultater={tillatteHandlinger.tillatteResultater}
      />
    );
  }

  function visDomfellelseFelter() {
    const domsdato = felter.filter((felt) => felt.felt === "politi.domsdato");
    const venstre = felter.filter((felt) => domfellelseVenstre.includes(felt.felt));
    const hoyre = felter.filter((felt) => domfellelseHoyre.includes(felt.felt));
    const etter = felter.filter((felt) => domfellelseEtter.includes(felt.felt));
    return (
      <>
        {domsdato.map(visFelt)}
        <HGrid columns={{ xs: 1, md: 2 }} gap="space-20">
          <VStack gap="space-20">{venstre.map(visFelt)}</VStack>
          <VStack gap="space-20">{hoyre.map(visFelt)}</VStack>
        </HGrid>
        {etter.map(visFelt)}
      </>
    );
  }

  return (
    <VStack gap="space-20">
      {undertittel && (
        <Heading size="small" level="2">
          {undertittel}
        </Heading>
      )}
      {verdier["politi.type"] === "DOMFELLELSE" ? visDomfellelseFelter() : felter.map(visFelt)}
    </VStack>
  );
}
