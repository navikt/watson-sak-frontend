import {
  Alert,
  DatePicker,
  Heading,
  HStack,
  Label,
  Loader,
  Select,
  Skeleton,
  ToggleGroup,
  VStack,
  useDatepicker,
} from "@navikt/ds-react";
import { useState } from "react";
import { useLoaderData, useNavigation, useSearchParams } from "react-router";
import { formaterTilIsoDato } from "~/utils/date-utils";
import { MiljøtilpassetTittel } from "~/layout/MiljøtilpassetTittel";
import { StatistikkDiagrammer } from "./StatistikkDiagrammer";
import { loader } from "./loader.server";

export { loader };

export const handle = { bredPageBlock: true };

export default function StatistikkSide() {
  const { data } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const [searchParams, setSearchParams] = useSearchParams();
  const laster = navigation.state !== "idle";
  const [visEgendefinert, setVisEgendefinert] = useState(
    Boolean(searchParams.get("fra") || searchParams.get("til")),
  );
  const omfang = searchParams.get("omfang") ?? data.valgtOmfang;
  const fra = searchParams.get("fra") ?? data.periode.fra;
  const til = searchParams.get("til") ?? data.periode.til;
  const { datepickerProps: fraProps, inputProps: fraInputProps } = useDatepicker({
    defaultSelected: new Date(fra),
    onDateChange: (date) => date && oppdaterDato("fra", formaterTilIsoDato(date)),
  });
  const { datepickerProps: tilProps, inputProps: tilInputProps } = useDatepicker({
    defaultSelected: new Date(til),
    onDateChange: (date) => date && oppdaterDato("til", formaterTilIsoDato(date)),
  });

  function oppdaterDato(nøkkel: "fra" | "til", verdi: string) {
    setSearchParams((forrige) => {
      const neste = new URLSearchParams(forrige);
      neste.set(nøkkel, verdi);
      neste.delete("periode");
      return neste;
    });
  }

  function velgPeriode(verdi: string) {
    if (verdi === "custom") {
      setVisEgendefinert(true);
      return;
    }
    const neste = new URLSearchParams(searchParams);
    neste.delete("fra");
    neste.delete("til");
    neste.set("periode", verdi);
    setSearchParams(neste);
    setVisEgendefinert(false);
  }

  return (
    <>
      <MiljøtilpassetTittel>Statistikk – Watson Sak</MiljøtilpassetTittel>
      <VStack gap={{ xs: "space-16", md: "space-20" }} className="mb-8 mt-4">
        <HStack justify="space-between" align="center" gap="space-8" wrap>
          <Heading level="1" size="large">
            Statistikk
          </Heading>
          {laster && <Loader size="small" title="Laster statistikk" />}
        </HStack>

        <Select
          label="Vis"
          className="w-auto min-w-72 self-start"
          value={omfang}
          onChange={(event) => {
            const neste = new URLSearchParams(searchParams);
            neste.set("omfang", event.target.value);
            setSearchParams(neste);
          }}
        >
          {data.organisasjonsvalg.map((valg) => (
            <option key={valg.verdi} value={valg.verdi}>
              {valg.label}
            </option>
          ))}
        </Select>

        {laster ? (
          <StatistikkSkeleton />
        ) : data.nøkkeltall.length === 0 ? (
          <>
            <Periodevelger
              visEgendefinert={visEgendefinert}
              searchParams={searchParams}
              onVelgPeriode={velgPeriode}
              fraProps={fraProps}
              fraInputProps={fraInputProps}
              tilProps={tilProps}
              tilInputProps={tilInputProps}
            />
            <Alert variant="info">Ingen statistikk finnes for valgt periode.</Alert>
          </>
        ) : (
          <StatistikkDiagrammer
            data={data}
            periodevelger={
              <Periodevelger
                visEgendefinert={visEgendefinert}
                searchParams={searchParams}
                onVelgPeriode={velgPeriode}
                fraProps={fraProps}
                fraInputProps={fraInputProps}
                tilProps={tilProps}
                tilInputProps={tilInputProps}
              />
            }
          />
        )}
      </VStack>
    </>
  );
}

type PeriodevelgerProps = {
  visEgendefinert: boolean;
  searchParams: URLSearchParams;
  onVelgPeriode: (verdi: string) => void;
  fraProps: ReturnType<typeof useDatepicker>["datepickerProps"];
  fraInputProps: ReturnType<typeof useDatepicker>["inputProps"];
  tilProps: ReturnType<typeof useDatepicker>["datepickerProps"];
  tilInputProps: ReturnType<typeof useDatepicker>["inputProps"];
};

function Periodevelger({
  visEgendefinert,
  searchParams,
  onVelgPeriode,
  fraProps,
  fraInputProps,
  tilProps,
  tilInputProps,
}: PeriodevelgerProps) {
  return (
    <VStack gap="space-8" align="start">
      <Label size="medium">Periode</Label>
      <ToggleGroup
        className="w-full max-w-[450px]"
        value={visEgendefinert ? "custom" : (searchParams.get("periode") ?? "month")}
        onChange={onVelgPeriode}
      >
        <ToggleGroup.Item value="year">2026</ToggleGroup.Item>
        <ToggleGroup.Item value="month">Denne måneden</ToggleGroup.Item>
        <ToggleGroup.Item value="custom">Egendefinert</ToggleGroup.Item>
      </ToggleGroup>
      {visEgendefinert && (
        <HStack gap="space-8" wrap>
          <DatePicker {...fraProps}>
            <DatePicker.Input {...fraInputProps} label="Fra" />
          </DatePicker>
          <DatePicker {...tilProps}>
            <DatePicker.Input {...tilInputProps} label="Til" />
          </DatePicker>
        </HStack>
      )}
    </VStack>
  );
}

function StatistikkSkeleton() {
  return (
    <VStack gap="space-12" aria-label="Laster statistikk">
      <Skeleton variant="rounded" height={64} />
      <Skeleton variant="rounded" height={260} />
      <Skeleton variant="rounded" height={320} />
    </VStack>
  );
}

export function ErrorBoundary() {
  return (
    <VStack className="mt-4">
      <Alert variant="error">
        <strong>Kunne ikke laste statistikk</strong>
        <br />
        Prøv igjen senere. Hvis problemet fortsetter, kontakt support.
      </Alert>
    </VStack>
  );
}
