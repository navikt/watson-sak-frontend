import { BodyShort, Box, Button, Heading, HGrid, HStack, VStack } from "@navikt/ds-react";
import { useState, type ReactNode } from "react";
import { Link as RouterLink } from "react-router";
import { Nøkkeltallkort } from "~/komponenter/Nøkkeltallkort";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import { ALLE_STEG } from "~/saker/steg";
import { Diagramkort, Legend } from "./Diagramkort";
import { fargeForKode, kakeGradient, tekstfargeForKode } from "./farger";
import { Saksflyt } from "./Saksflyt";
import type { Statistikk } from "./types";
import { formaterAntallSaker, formaterBeløp, prosentFormatter, visningsnavn } from "./visning";

const formatter = new Intl.NumberFormat("nb-NO");
const ALDER_GRENSE_MND = 12;

/** Tolker nedre grense i månedsbøtter som «12–24» eller «>24», slik at vi kan
 * summere antall saker over en gitt alder uten å hardkode tallet i UI-et. */
function nedreAldersgrense(navn: string): number {
  return Number.parseInt(navn.replace(">", "").split(/[–-]/)[0], 10) || 0;
}

/** Beløp kommer som streng fra backend. Tomme eller ugyldige verdier regnes ikke som null. */
function erNull(beløp: string): boolean {
  const tall = Number(beløp.replaceAll(/\s/g, "").replace(",", "."));
  return Number.isFinite(tall) && tall === 0;
}

function lagSaksfilterUrl(parametre: Record<string, string>) {
  const searchParams = new URLSearchParams(parametre);
  return `${RouteConfig.ALLE_SAKER}?${searchParams.toString()}`;
}

function leggTilOmfang(searchParams: URLSearchParams, data: Statistikk) {
  data.omfangEnheter.forEach((enhet) => searchParams.append("enhet", enhet));
  if (data.valgtOmfang === "meg") {
    searchParams.set("ansvarlig", "MEG");
  }
}

function lagStegfilterUrl(steg: string[], data: Statistikk, status?: string[]): string {
  const searchParams = new URLSearchParams();
  steg.forEach((verdi) => searchParams.append("steg", verdi));
  status?.forEach((verdi) => searchParams.append("status", verdi));
  leggTilOmfang(searchParams, data);
  return `${RouteConfig.ALLE_SAKER}?${searchParams.toString()}`;
}

function lenkeForNøkkeltall(
  tall: Statistikk["nøkkeltall"][number],
  data: Statistikk,
): string | null {
  switch (tall.label) {
    case "Totalt":
      return lagStegfilterUrl(ALLE_STEG, data);
    // Samme definisjon som SakKategori i backend, slik at lista viser like mange saker som kortet.
    case "Aktive":
      return lagStegfilterUrl(["UTREDNING", "STRAFFERETTSLIG_VURDERING"], data, [
        "AKTIV",
        "PAAKLAGET",
        "UTEN_STATUS",
      ]);
    case "Venter på andre":
      return lagStegfilterUrl(ALLE_STEG, data, [
        "VENTER_PA_INFORMASJON",
        "VENTER_PA_VEDTAK",
        "VENTER_PA_RESULTAT",
        "I_BERO",
        "HOS_FORVALTNING",
        "HOS_POLITI",
      ]);
    case "Ikke fordelt":
      return RouteConfig.FORDELING;
    case "Eldste åpne sak": {
      const sakId = /^Sak (\d+)$/.exec(tall.forklaring)?.[1];
      return sakId ? RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId)) : null;
    }
    default:
      return null;
  }
}

const ALDERSVARSEL_FOR_VARSELFILTER: Record<string, string> = {
  "nærmer-seg-frist": "NAERMER_SEG_12_MAANEDER",
  "over-30-dager": "FRA_30_DAGER",
};

/** Lenke til saksoversikten med samme utvalg som varslet, eller `null` for ukjente varsler.
 * Uten kjent filter ville lenken vist et bredere utvalg enn varslet lover. */
function lagVarselUrl(filter: string, data: Statistikk): string | null {
  const aldersvarsel = ALDERSVARSEL_FOR_VARSELFILTER[filter];
  if (!aldersvarsel) return null;
  const searchParams = new URLSearchParams({ aldersvarsel });
  leggTilOmfang(searchParams, data);
  return `${RouteConfig.ALLE_SAKER}?${searchParams.toString()}`;
}

function LenkeTilSaker({
  varsel,
  data,
}: {
  varsel: Statistikk["varsler"][number];
  data: Statistikk;
}) {
  const url = lagVarselUrl(varsel.filter, data);
  if (!url) return null;
  // Det tilgjengelige navnet tar med varselteksten, så lenkene kan skilles i en skjermlesers
  // lenkeliste. Navnet starter med den synlige teksten (WCAG 2.5.3 Label in Name).
  return (
    <Button
      as={RouterLink}
      to={url}
      variant="tertiary"
      size="small"
      aria-label={`Se alle saker: ${varsel.tekst}`}
    >
      Se alle saker →
    </Button>
  );
}

export function StatistikkDiagrammer({
  data,
  periodevelger,
}: {
  data: Statistikk;
  periodevelger?: ReactNode;
}) {
  const [skjulteStatuser, setSkjulteStatuser] = useState<Set<string>>(new Set());
  const totalKategorier = data.kategorifordeling.reduce((sum, item) => sum + item.verdi, 0);
  const totalHenlagt = data.henlagt.reduce((sum, item) => sum + item.verdi, 0);
  const totalKontrollrapport = data.kontrollrapport.reduce((sum, item) => sum + item.verdi, 0);
  const periodeErTom =
    data.periodeTall.innkomne === 0 &&
    data.periodeTall.avsluttede === 0 &&
    [
      data.periodeTall.antattBeløp,
      data.periodeTall.vedtattBeløp,
      data.periodeTall.anmeldtBeløp,
    ].every((beløp) => erNull(beløp)) &&
    data.statusfordeling.every((status) => status.verdi === 0) &&
    totalKategorier === 0 &&
    totalKontrollrapport === 0 &&
    totalHenlagt === 0;
  const snittDagerAvsluttet = data.periodeTall.snittDagerAvsluttet;
  const radSummer = data.sakstyper.map((rad) => {
    const synlige = rad.deler.filter(({ navn, verdi }) => verdi > 0 && !skjulteStatuser.has(navn));
    return { rad, synlige, total: synlige.reduce((sum, del) => sum + del.verdi, 0) };
  });
  const maksSakstype = Math.max(1, ...radSummer.map(({ total }) => total));
  const maksAlder = Math.max(1, ...data.alderssammensetning.map((alder) => alder.verdi));
  const antallOverGrense = data.alderssammensetning
    .filter((bucket) => nedreAldersgrense(bucket.navn) >= ALDER_GRENSE_MND)
    .reduce((sum, bucket) => sum + bucket.verdi, 0);
  const øyeblikksbildeErTom =
    data.varsler.length === 0 &&
    data.nøkkeltall.every((tall) => !/[1-9]/.test(tall.verdi)) &&
    data.sakstyper.every((rad) => rad.deler.every((del) => del.verdi === 0)) &&
    data.alderssammensetning.every((alder) => alder.verdi === 0);

  function toggleStatus(navn: string) {
    setSkjulteStatuser((forrige) => {
      const neste = new Set(forrige);
      if (neste.has(navn)) {
        neste.delete(navn);
      } else {
        neste.add(navn);
      }
      return neste;
    });
  }

  if (øyeblikksbildeErTom && periodeErTom) {
    return (
      <VStack gap="space-20">
        {periodevelger}
        <TomStatistikk />
      </VStack>
    );
  }

  return (
    <VStack gap={{ xs: "space-16", md: "space-20" }}>
      <HGrid columns={{ xs: 1, lg: 2 }} gap="space-12">
        {data.varsler.map((varsel) => (
          <Box
            key={varsel.tekst}
            background={varsel.tone === "warning" ? "warning-soft" : "info-soft"}
            borderColor="neutral-subtle"
            borderWidth="1"
            borderRadius="8"
            padding="space-12"
          >
            <HStack justify="space-between" align="center" gap="space-8" wrap>
              <BodyShort size="small">{varsel.tekst}</BodyShort>
              <LenkeTilSaker varsel={varsel} data={data} />
            </HStack>
          </Box>
        ))}
      </HGrid>

      <Box as="section" aria-label="Nøkkeltall" className="mt-1">
        <Heading level="2" size="small">
          Øyeblikksbilde
        </Heading>
        <HGrid columns={{ xs: 2, sm: 3, xl: 6 }} gap="space-12" className="mt-2">
          {data.nøkkeltall.map((tall) => (
            <NøkkeltallKort key={tall.label} tall={tall} data={data} />
          ))}
        </HGrid>
      </Box>

      <HGrid columns={{ xs: 1, lg: 3 }} gap="space-12">
        <Diagramkort
          title="Sakstype fordelt på steg"
          description="Klikk et segment for å åpne filtrert saksoversikt"
          className="min-h-[438px] lg:col-span-2"
        >
          {data.sakstyper.length === 0 ? (
            <BodyShort size="small">Ingen sakstyper å vise for valgt periode.</BodyShort>
          ) : (
            <>
              <Legend
                items={data.sakstyper[0].deler.map(({ navn, filterverdi }) => ({
                  navn: visningsnavn(navn),
                  farge: fargeForKode(filterverdi),
                }))}
                skjulte={skjulteStatuser}
                onToggle={toggleStatus}
              />
              <VStack gap="space-8">
                {radSummer.map(({ rad, synlige, total }) => (
                  <HStack key={rad.navn} gap="space-8" align="center" wrap={false}>
                    <BodyShort size="small" className="w-28 shrink-0 text-right">
                      {visningsnavn(rad.navn)}
                    </BodyShort>
                    <div className="min-w-0 flex-1">
                      <HStack gap="space-8" align="center" wrap={false}>
                        <div
                          className="flex h-6 min-w-0 gap-0.5 overflow-hidden rounded-sm"
                          style={{ width: `calc((100% - 3rem) * ${total / maksSakstype})` }}
                          title={`${rad.navn}: ${formatter.format(total)} saker`}
                        >
                          {synlige.map((del) => (
                            <RouterLink
                              key={del.navn}
                              to={lagSaksfilterUrl({
                                kategori: rad.filterverdi,
                                steg: del.filterverdi,
                              })}
                              aria-label={`${visningsnavn(rad.navn)}, ${visningsnavn(del.navn)}: ${formatter.format(del.verdi)} saker`}
                              className="flex h-full min-w-0 basis-0 items-center justify-center overflow-hidden text-sm font-semibold focus-visible:z-10"
                              style={{
                                flexGrow: del.verdi,
                                backgroundColor: `var(${fargeForKode(del.filterverdi)})`,
                                color: `var(${tekstfargeForKode(del.filterverdi)})`,
                              }}
                              title={`${visningsnavn(rad.navn)}, ${visningsnavn(del.navn)}: ${formatter.format(del.verdi)} saker`}
                            >
                              <span aria-hidden>{formatter.format(del.verdi)}</span>
                            </RouterLink>
                          ))}
                        </div>
                        <BodyShort size="small" weight="semibold" className="shrink-0">
                          {formatter.format(total)}
                        </BodyShort>
                      </HStack>
                    </div>
                  </HStack>
                ))}
              </VStack>
            </>
          )}
        </Diagramkort>

        <Diagramkort
          title="Alderssammensetning"
          description="Porteføljen etter behandlingstid"
          className="min-h-[438px]"
        >
          <BodyShort size="small" className="text-ax-text-danger">
            {formaterAntallSaker(antallOverGrense)} over 12 mnd
          </BodyShort>
          <div className="flex min-h-64 flex-1 items-end justify-around gap-2 border-b border-ax-border-neutral-subtle">
            {data.alderssammensetning.map((alder) => (
              <div
                key={alder.navn}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1 text-xs"
                title={`${alder.navn}: ${alder.verdi} saker`}
              >
                <span>{alder.verdi}</span>
                <span
                  className="w-full rounded-t-sm"
                  style={{
                    height: `${Math.max((alder.verdi / maksAlder) * 82, 4)}%`,
                    backgroundColor:
                      nedreAldersgrense(alder.navn) >= ALDER_GRENSE_MND
                        ? "var(--ax-bg-danger-strong)"
                        : "var(--ax-bg-accent-strong)",
                  }}
                />
                <span>{alder.navn}</span>
              </div>
            ))}
          </div>
        </Diagramkort>
      </HGrid>

      {periodevelger}

      {periodeErTom ? (
        <TomStatistikk />
      ) : (
        <>
          <HGrid columns={{ xs: 1, lg: "2fr 3fr" }} gap={{ xs: "space-16", lg: "space-64" }}>
            <VStack gap="space-8">
              <BodyShort size="small" weight="semibold" className="text-ax-text-neutral-subtle">
                Utvikling i perioden
              </BodyShort>
              <HGrid columns={2} gap="space-8">
                <Metric
                  label="Innkomne"
                  value={data.periodeTall.innkomne}
                  suffix="i perioden"
                  tone="success"
                />
                <Metric
                  label="Avsluttet"
                  value={data.periodeTall.avsluttede}
                  suffix={
                    snittDagerAvsluttet == null
                      ? "i perioden"
                      : `Snitt ${snittDagerAvsluttet} dager`
                  }
                  tone="neutral"
                />
              </HGrid>
            </VStack>
            <VStack gap="space-8">
              <BodyShort size="small" weight="semibold" className="text-ax-text-neutral-subtle">
                Beløp i perioden
              </BodyShort>
              <HGrid columns={3} gap="space-8">
                <Metric
                  label="Antatt beløp"
                  value={formaterBeløp(data.periodeTall.antattBeløp)}
                  suffix="kroner"
                  tone="warning"
                />
                <Metric
                  label="Vedtatt beløp"
                  value={formaterBeløp(data.periodeTall.vedtattBeløp)}
                  suffix="kroner"
                  tone="success"
                />
                <Metric
                  label="Anmeldt beløp"
                  value={formaterBeløp(data.periodeTall.anmeldtBeløp)}
                  suffix="kroner"
                  tone="danger"
                />
              </HGrid>
            </VStack>
          </HGrid>

          <HGrid columns={{ xs: 1, lg: 3 }} gap="space-12">
            <Saksflyt data={data.statusfordeling} />

            <Diagramkort title="Sakskategorifordeling" description="Andel av totalt antall saker">
              <div
                className="mx-auto size-52 rounded-full"
                style={{
                  background: kakeGradient(
                    data.kategorifordeling.map((kategori) => ({
                      farge: fargeForKode(kategori.navn),
                      verdi: kategori.verdi,
                    })),
                  ),
                }}
              >
                <div className="m-12 flex size-28 items-center justify-center rounded-full bg-ax-bg-default text-center text-sm">
                  {formaterAntallSaker(totalKategorier)}
                </div>
              </div>
              <Legend
                items={data.kategorifordeling.map((kategori) => ({
                  ...kategori,
                  farge: fargeForKode(kategori.navn),
                }))}
              />
            </Diagramkort>
          </HGrid>

          <HGrid columns={{ xs: 1, lg: 2 }} gap="space-12">
            <Diagramkort
              title="Fordeling av kontrollrapporttype"
              description={`Av ${formaterAntallSaker(totalKontrollrapport)} med kontrollrapport`}
            >
              <VStack gap="space-12">
                {data.kontrollrapport.map((rad) => (
                  <div key={rad.navn}>
                    <HStack justify="space-between">
                      <BodyShort size="small">{visningsnavn(rad.navn)}</BodyShort>
                      <BodyShort size="small">{prosentFormatter.format(rad.prosent)}%</BodyShort>
                    </HStack>
                    <div className="mt-1 h-4 overflow-hidden rounded-sm bg-ax-bg-neutral-moderate">
                      <div
                        className="h-full bg-ax-bg-accent-strong"
                        style={{ width: `${rad.prosent}%` }}
                      />
                    </div>
                    <BodyShort size="small">{formaterAntallSaker(rad.verdi)}</BodyShort>
                  </div>
                ))}
              </VStack>
            </Diagramkort>

            <Diagramkort
              title="Henlagt – fordelt på grunn"
              description={`Av totalt ${formatter.format(totalHenlagt)} ${totalHenlagt === 1 ? "henlagt sak" : "henlagte saker"}`}
            >
              <VStack align="center" gap="space-8">
                <div
                  className="size-36 rounded-full"
                  style={{
                    background: kakeGradient(
                      data.henlagt.map((rad) => ({
                        farge: fargeForKode(rad.navn),
                        verdi: rad.verdi,
                      })),
                    ),
                  }}
                >
                  <div className="m-8 flex size-20 items-center justify-center rounded-full bg-ax-bg-default text-center text-xs">
                    {formatter.format(totalHenlagt)}
                    <br />
                    henlagt
                  </div>
                </div>
                <Legend
                  items={data.henlagt.map((rad) => ({ ...rad, farge: fargeForKode(rad.navn) }))}
                />
              </VStack>
            </Diagramkort>
          </HGrid>
        </>
      )}
    </VStack>
  );
}

function NøkkeltallKort({
  tall,
  data,
}: {
  tall: Statistikk["nøkkeltall"][number];
  data: Statistikk;
}) {
  const farge =
    tall.label === "Venter på andre"
      ? "meta-purple"
      : tall.label === "Saksbehandlingstid"
        ? "info"
        : tall.tone;

  return (
    <Nøkkeltallkort
      verdi={tall.verdi}
      etikett={tall.label}
      forklaring={tall.forklaring}
      farge={farge}
      lenke={lenkeForNøkkeltall(tall, data)}
    />
  );
}

function TomStatistikk() {
  return (
    <VStack
      as="section"
      aria-label="Ingen statistikk å vise"
      align="center"
      gap="space-8"
      paddingBlock="space-64"
      paddingInline="space-16"
      className="text-center"
    >
      <Heading level="2" size="medium">
        Ingen statistikk å vise
      </Heading>
      <BodyShort>Det finnes ingen informasjon for utvalget og tidsperioden du har valgt.</BodyShort>
      <BodyShort>Velg et annet utvalg eller en annen tidsperiode.</BodyShort>
    </VStack>
  );
}

function Metric({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: string | number;
  suffix: string;
  tone: "success" | "warning" | "danger" | "neutral";
}) {
  return (
    <Box
      borderColor="neutral-subtle"
      borderWidth="1"
      borderRadius="4"
      padding="space-12"
      className={`border-t-4 ${
        tone === "success"
          ? "border-t-ax-border-success"
          : tone === "warning"
            ? "border-t-ax-border-warning"
            : tone === "danger"
              ? "border-t-ax-border-danger"
              : "border-t-ax-border-neutral"
      }`}
    >
      <BodyShort size="small">{label}</BodyShort>
      <BodyShort size="large" weight="semibold">
        {typeof value === "number" ? formatter.format(value) : value}
      </BodyShort>
      <BodyShort size="small">{suffix}</BodyShort>
    </Box>
  );
}
