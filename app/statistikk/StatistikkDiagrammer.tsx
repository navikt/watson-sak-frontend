import { BodyShort, Box, Button, HGrid, HStack, VStack } from "@navikt/ds-react";
import { useState, type ReactNode } from "react";
import { Link as RouterLink } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { Diagramkort, Legend } from "./Diagramkort";
import { fargeForKode } from "./farger";
import type { Statistikk } from "./types";

const formatter = new Intl.NumberFormat("nb-NO");
const ALDER_GRENSE_MND = 12;

/** Tolker nedre grense i månedsbøtter som «12–24» eller «>24», slik at vi kan
 * summere antall saker over en gitt alder uten å hardkode tallet i UI-et. */
function nedreAldersgrense(navn: string): number {
  return Number.parseInt(navn.replace(">", "").split(/[–-]/)[0], 10) || 0;
}

function lagSaksfilterUrl(parametre: Record<string, string>) {
  const searchParams = new URLSearchParams(parametre);
  return `${RouteConfig.ALLE_SAKER}?${searchParams.toString()}`;
}

/** «Alle saker» støtter i dag bare filtrering på enhet, saksbehandler, kategori,
 * misbrukstype, merking og steg. Varslene under er basert på behandlingstid, som
 * ikke har noe tilsvarende filter der ennå. Vi lenker derfor kun videre til en
 * usfiltrert saksoversikt i stedet for å love en filtrering vi ikke kan innfri. */
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
  const antallOverGrense = data.alderssammensetning
    .filter((bucket) => nedreAldersgrense(bucket.navn) >= ALDER_GRENSE_MND)
    .reduce((sum, bucket) => sum + bucket.verdi, 0);

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
        <BodyShort size="small" weight="semibold">
          Øyeblikksbilde
        </BodyShort>
        <HGrid columns={{ xs: 2, sm: 3, xl: 6 }} gap="space-8" className="mt-2">
          {data.nøkkeltall.map((tall) => (
            <Box
              key={tall.label}
              borderColor="neutral-subtle"
              borderWidth="1"
              borderRadius="4"
              padding="space-12"
              className={`border-t-4 ${
                tall.tone === "danger"
                  ? "border-t-ax-border-danger"
                  : tall.tone === "warning"
                    ? "border-t-ax-border-warning"
                    : tall.tone === "success"
                      ? "border-t-ax-border-success"
                      : tall.tone === "accent"
                        ? "border-t-ax-border-accent"
                        : "border-t-ax-border-neutral"
              }`}
            >
              <BodyShort size="small">{tall.label}</BodyShort>
              <BodyShort size="large" weight="semibold">
                {tall.verdi}
              </BodyShort>
              <BodyShort size="small">{tall.forklaring}</BodyShort>
            </Box>
          ))}
        </HGrid>
      </Box>

      <HGrid columns={{ xs: 1, lg: 3 }} gap="space-12">
        <Diagramkort
          title="Sakstype fordelt på status"
          description="Klikk et segment for å åpne filtrert saksoversikt"
          className="min-h-[438px] lg:col-span-2"
        >
          {data.sakstyper.length === 0 ? (
            <BodyShort size="small">Ingen sakstyper å vise for valgt periode.</BodyShort>
          ) : (
            <>
              <Legend
                items={data.sakstyper[0].deler.map(({ navn, filterverdi }) => ({
                  navn,
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
                        {rad.navn}
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
                            aria-label={`${rad.navn}, ${del.navn}: ${formatter.format(del.verdi)} saker`}
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
            {formatter.format(antallOverGrense)} saker over 12 mnd
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
                    height: `${Math.max((alder.verdi / 49) * 82, 4)}%`,
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
              suffix="Snitt 32 dager"
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
              value={data.periodeTall.antattBeløp}
              suffix="kroner"
              tone="warning"
            />
            <Metric
              label="Vedtatt beløp"
              value={data.periodeTall.vedtattBeløp}
              suffix="kroner"
              tone="success"
            />
            <Metric
              label="Anmeldt beløp"
              value={data.periodeTall.anmeldtBeløp}
              suffix="kroner"
              tone="danger"
            />
          </HGrid>
        </VStack>
      </HGrid>

      <HGrid columns={{ xs: 1, lg: 3 }} gap="space-12">
        <Diagramkort
          title="Statusfordeling"
          description="Saker fordelt på status"
          className="lg:col-span-2"
        >
          <VStack gap="space-8">
            {data.statusfordeling.map((status) => (
              <HStack key={status.navn} align="center" gap="space-8" wrap={false}>
                <BodyShort size="small" className="w-32 shrink-0 text-right">
                  {status.navn}
                </BodyShort>
                <div className="min-w-0 flex-1">
                  <RouterLink
                    to={lagSaksfilterUrl({ steg: status.filterverdi })}
                    className="flex h-8 items-center rounded-sm bg-ax-bg-accent-strong px-2 font-semibold text-ax-text-neutral-contrast no-underline"
                    style={{ width: `${status.prosent}%` }}
                    title={`${status.navn}: ${formatter.format(status.verdi)} saker`}
                  >
                    {status.verdi}
                  </RouterLink>
                </div>
                <BodyShort size="small" className="w-10 shrink-0 whitespace-nowrap">
                  {status.prosent} %
                </BodyShort>
              </HStack>
            ))}
          </VStack>
        </Diagramkort>

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
              {formatter.format(totalKategorier)} saker
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
          description="Av 120 saker med kontrollrapport"
        >
          <VStack gap="space-12">
            {data.kontrollrapport.map((rad) => (
              <div key={rad.navn}>
                <HStack justify="space-between">
                  <BodyShort size="small">{rad.navn}</BodyShort>
                  <BodyShort size="small">{rad.prosent}%</BodyShort>
                </HStack>
                <div className="mt-1 h-4 overflow-hidden rounded-sm bg-ax-bg-neutral-moderate">
                  <div
                    className="h-full bg-ax-bg-accent-strong"
                    style={{ width: `${rad.prosent}%` }}
                  />
                </div>
                <BodyShort size="small">{rad.verdi} saker</BodyShort>
              </div>
            ))}
          </VStack>
        </Diagramkort>

        <Diagramkort title="Henlagt – fordelt på grunn" description="Av totalt 168 henlagte saker">
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
                    return `var(${fargeForKode(rad.navn)}) ${(start / 168) * 100}% ${(slutt / 168) * 100}%`;
                  })
                  .join(", ")})`,
              }}
            >
              <div className="m-8 flex size-20 items-center justify-center rounded-full bg-ax-bg-default text-center text-xs">
                168
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
