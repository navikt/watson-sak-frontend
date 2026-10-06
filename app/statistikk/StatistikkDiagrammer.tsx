import { BodyShort, Box, Button, Detail, Heading, HGrid, HStack, VStack } from "@navikt/ds-react";
import { ChevronRightCircleIcon } from "@navikt/aksel-icons";
import { useState, type ReactNode } from "react";
import { Link as RouterLink } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import { ALLE_STEG } from "~/saker/steg";
import { Diagramkort, Legend } from "./Diagramkort";
import { fargeForKode } from "./farger";
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

function lagStegfilterUrl(steg: string[], data: Statistikk, status?: string[]): string {
  const searchParams = new URLSearchParams();
  steg.forEach((verdi) => searchParams.append("steg", verdi));
  status?.forEach((verdi) => searchParams.append("status", verdi));
  data.omfangEnheter.forEach((enhet) => searchParams.append("enhet", enhet));
  if (data.omfangAnsvarligNavIdent) {
    searchParams.set("saksbehandler", data.omfangAnsvarligNavIdent);
  }
  return `${RouteConfig.ALLE_SAKER}?${searchParams.toString()}`;
}

function lenkeForNøkkeltall(
  tall: Statistikk["nøkkeltall"][number],
  data: Statistikk,
): string | null {
  switch (tall.label) {
    case "Totalt":
      return lagStegfilterUrl(ALLE_STEG, data);
    case "Aktive":
      return lagStegfilterUrl(["UTREDNING", "STRAFFERETTSLIG_VURDERING"], data, ["AKTIV"]);
    case "Venter på andre":
      return lagStegfilterUrl(ALLE_STEG, data, [
        "VENTER_PA_INFORMASJON",
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

/** Varslene er basert på behandlingstid, som ikke har et tilsvarende saksfilter ennå.
 * Vi lenker derfor til saksoversikten uten filter i stedet for å love en filtrering vi ikke kan innfri. */
function LenkeTilSaker() {
  return (
    <Button as={RouterLink} to={RouteConfig.ALLE_SAKER} variant="tertiary" size="small">
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
              <LenkeTilSaker />
            </HStack>
          </Box>
        ))}
      </HGrid>

      <Box as="section" aria-label="Nøkkeltall">
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
                {data.sakstyper.map((rad) => {
                  const synlige = rad.deler.filter(({ navn }) => !skjulteStatuser.has(navn));
                  const total = synlige.reduce((sum, del) => sum + del.verdi, 0);
                  return (
                    <HStack key={rad.navn} gap="space-8" align="center" wrap={false}>
                      <BodyShort size="small" className="w-20 shrink-0 text-right">
                        {visningsnavn(rad.navn)}
                      </BodyShort>
                      <div
                        className="flex h-6 min-w-0 flex-1 overflow-hidden rounded-sm"
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
                            className="block h-full focus-visible:z-10"
                            style={{
                              width: `${(del.verdi / Math.max(total, 1)) * 100}%`,
                              backgroundColor: `var(${fargeForKode(del.filterverdi)})`,
                            }}
                          />
                        ))}
                      </div>
                    </HStack>
                  );
                })}
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
                    backgroundColor: `var(${fargeForKode(alder.navn)})`,
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
                  background: `conic-gradient(${data.kategorifordeling
                    .map((kategori, index, alle) => {
                      const start = alle.slice(0, index).reduce((sum, item) => sum + item.verdi, 0);
                      const slutt = start + kategori.verdi;
                      return `var(${fargeForKode(kategori.navn)}) ${(start / totalKategorier) * 100}% ${(slutt / totalKategorier) * 100}%`;
                    })
                    .join(", ")})`,
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
                    background: `conic-gradient(${data.henlagt
                      .map((rad, index) => {
                        const start = data.henlagt
                          .slice(0, index)
                          .reduce((sum, item) => sum + item.verdi, 0);
                        const slutt = start + rad.verdi;
                        const nevner = Math.max(totalHenlagt, 1);
                        return `var(${fargeForKode(rad.navn)}) ${(start / nevner) * 100}% ${(slutt / nevner) * 100}%`;
                      })
                      .join(", ")})`,
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
  const lenke = lenkeForNøkkeltall(tall, data);
  const farge =
    tall.label === "Venter på andre"
      ? "meta-purple"
      : tall.label === "Saksbehandlingstid"
        ? "info"
        : tall.tone;
  const kort = (
    <Box
      background="default"
      data-color={farge}
      borderColor="neutral-subtle"
      borderWidth="1"
      borderRadius="8"
      paddingInline="space-16"
      paddingBlock="space-12"
      style={{ borderTopColor: `var(--ax-border-${farge})` }}
      className={`relative h-full border-t-4 ${
        lenke ? "transition-colors hover:border-ax-border-accent" : ""
      }`}
    >
      <VStack gap="space-12">
        <Heading
          as="p"
          size="medium"
          textColor="subtle"
          data-color={farge}
          style={lenke ? { maxWidth: "calc(100% - var(--ax-space-32))" } : undefined}
        >
          {tall.verdi}
        </Heading>
        <div>
          <Detail weight="semibold" data-color="neutral">
            {tall.label}
          </Detail>
          <Detail textColor="subtle" data-color="neutral">
            {tall.forklaring}
          </Detail>
        </div>
      </VStack>
      {lenke && (
        <span className="absolute top-[var(--ax-space-12)] right-[var(--ax-space-16)] text-ax-text-neutral">
          <ChevronRightCircleIcon fontSize="1.5rem" aria-hidden="true" />
        </span>
      )}
    </Box>
  );

  return lenke ? (
    <RouterLink
      to={lenke}
      className="block h-full rounded-[var(--ax-radius-8)] text-ax-text-neutral no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ax-border-focus"
    >
      {kort}
    </RouterLink>
  ) : (
    kort
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
