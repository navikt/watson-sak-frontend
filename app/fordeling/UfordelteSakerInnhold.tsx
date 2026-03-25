import { BodyShort, Chips, Heading, HStack, Label, Pagination, VStack } from "@navikt/ds-react";
import { useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { TildelSaksbehandlerModal } from "~/saker/handlinger/TildelSaksbehandlerModal";
import { formaterDato } from "~/utils/date-utils";
import {
  filtrerUfordelteSaker,
  hentUfordelteFiltervalg,
  lagUfordelteOppsummering,
  paginerElementer,
  sorterUfordelteSaker,
  ufordelteSorteringskolonner,
  type UfordeltSorteringskolonne,
  type UfordeltSorteringsretning,
} from "./ufordelte-saker";
import type { FordelingSak } from "./typer";

const antallPerSide = 6;

interface UfordelteSakerInnholdProps {
  saker: FordelingSak[];
  saksbehandlere: string[];
  submitPath?: string;
}

export function UfordelteSakerInnhold({
  saker,
  saksbehandlere,
  submitPath = RouteConfig.FORDELING,
}: UfordelteSakerInnholdProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sakSomTildeles, setSakSomTildeles] = useState<FordelingSak | null>(null);

  const valgteKategorier = hentValgteVerdier(searchParams, "kategori");
  const valgteYtelser = hentValgteVerdier(searchParams, "ytelse");
  const valgtSide = Number.parseInt(searchParams.get("side") ?? "1", 10) || 1;
  const sorteringskolonne = hentSorteringskolonne(searchParams.get("sorter"));
  const sorteringsretning = hentSorteringsretning(searchParams.get("retning"));

  const filtervalg = useMemo(() => hentUfordelteFiltervalg(saker), [saker]);
  const filtrerteSaker = useMemo(
    () =>
      filtrerUfordelteSaker(saker, {
        kategorier: valgteKategorier,
        ytelser: valgteYtelser,
      }),
    [saker, valgteKategorier, valgteYtelser],
  );
  const sorterteSaker = useMemo(() => {
    if (!sorteringskolonne || !sorteringsretning) {
      return filtrerteSaker;
    }

    return sorterUfordelteSaker(filtrerteSaker, sorteringskolonne, sorteringsretning);
  }, [filtrerteSaker, sorteringskolonne, sorteringsretning]);
  const paginerteSaker = useMemo(
    () => paginerElementer(sorterteSaker, valgtSide, antallPerSide),
    [sorterteSaker, valgtSide],
  );
  const oppsummering = useMemo(() => lagUfordelteOppsummering(filtrerteSaker), [filtrerteSaker]);

  function oppdaterValg(nøkkel: "kategori" | "ytelse", verdi: string) {
    const eksisterendeVerdier = hentValgteVerdier(searchParams, nøkkel);
    const nesteVerdier = eksisterendeVerdier.includes(verdi)
      ? eksisterendeVerdier.filter((eksisterendeVerdi) => eksisterendeVerdi !== verdi)
      : [...eksisterendeVerdier, verdi];

    setSearchParams((forrige) => {
      const neste = new URLSearchParams(forrige);

      if (nesteVerdier.length > 0) {
        neste.set(nøkkel, nesteVerdier.join(","));
      } else {
        neste.delete(nøkkel);
      }

      neste.delete("side");
      return neste;
    });
  }

  function gåTilSide(side: number) {
    setSearchParams((forrige) => {
      const neste = new URLSearchParams(forrige);
      neste.set("side", String(side));
      return neste;
    });
  }

  function sorterPåKolonne(kolonne: UfordeltSorteringskolonne) {
    setSearchParams((forrige) => {
      const neste = new URLSearchParams(forrige);
      const nesteRetning =
        sorteringskolonne === kolonne
          ? sorteringsretning === "stigende"
            ? "synkende"
            : "stigende"
          : hentStandardRetning(kolonne);

      neste.set("sorter", kolonne);
      neste.set("retning", nesteRetning);
      neste.delete("side");
      return neste;
    });
  }

  const harIngenTreff = paginerteSaker.elementer.length === 0;

  return (
    <section aria-labelledby="ufordelte-saker-overskrift" className="pb-12">
      <VStack gap="space-6" className="mt-4">
        <Heading id="ufordelte-saker-overskrift" level="1" size="large">
          Ufordelte saker
        </Heading>

        <div className="grid gap-4 md:grid-cols-3">
          <Oppsummeringskort tittel="Antall">{oppsummering.antallTekst}</Oppsummeringskort>
          <Oppsummeringskort tittel="Liggetid">{oppsummering.eldsteTekst}</Oppsummeringskort>
          <Oppsummeringskort tittel="Ytelser">{oppsummering.ytelserTekst}</Oppsummeringskort>
        </div>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
          <div className="min-w-0">
            <div className="overflow-hidden rounded-2xl border border-ax-border-neutral-subtle bg-ax-bg-default">
              <div className="overflow-x-auto">
                <table className="min-w-full table-fixed border-collapse">
                  <thead>
                    <tr className="border-b border-ax-border-neutral-subtle">
                      <KolonneOverskrift
                        tittel="Kategori"
                        kolonne="kategori"
                        aktivKolonne={sorteringskolonne}
                        retning={sorteringsretning}
                        onSort={sorterPåKolonne}
                        className="w-48"
                      />
                      <KolonneOverskrift
                        tittel="Ytelse"
                        kolonne="ytelse"
                        aktivKolonne={sorteringskolonne}
                        retning={sorteringsretning}
                        onSort={sorterPåKolonne}
                        className="w-[28rem]"
                      />
                      <KolonneOverskrift
                        tittel="Opprettet"
                        kolonne="opprettet"
                        aktivKolonne={sorteringskolonne}
                        retning={sorteringsretning}
                        onSort={sorterPåKolonne}
                        className="w-40"
                      />
                      <KolonneOverskrift className="w-24">
                        <span className="sr-only">Handling</span>
                      </KolonneOverskrift>
                    </tr>
                  </thead>
                  <tbody>
                    {harIngenTreff ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-8">
                          <BodyShort className="text-ax-text-neutral-subtle">
                            Ingen ufordelte saker matcher filtrene.
                          </BodyShort>
                        </td>
                      </tr>
                    ) : (
                      paginerteSaker.elementer.map((sak) => (
                        <tr
                          key={sak.id}
                          className="border-b border-ax-border-neutral-subtle last:border-b-0"
                        >
                          <Celle>
                            <KategoriPille kategori={sak.kategori ?? "Uten kategori"} />
                          </Celle>
                          <Celle>
                            <div className="flex flex-wrap gap-2">
                              {sak.ytelser.map((ytelse) => (
                                <YtelsePille key={ytelse}>{ytelse}</YtelsePille>
                              ))}
                            </div>
                          </Celle>
                          <Celle>{formaterDato(sak.opprettetDato)}</Celle>
                          <Celle className="text-right">
                            <button
                              type="button"
                              onClick={() => setSakSomTildeles(sak)}
                              className="cursor-pointer border-none bg-transparent p-0 text-sm font-semibold text-ax-text-accent underline-offset-2 hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ax-border-accent"
                            >
                              Tildel
                            </button>
                          </Celle>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {paginerteSaker.totalSider > 1 && (
              <HStack justify="center" className="mt-6">
                <Pagination
                  page={paginerteSaker.aktivSide}
                  onPageChange={gåTilSide}
                  count={paginerteSaker.totalSider}
                  size="small"
                />
              </HStack>
            )}
          </div>

          <div className="space-y-8">
            <Filtergruppe
              tittel="Kategori"
              verdier={filtervalg.kategorier}
              valgteVerdier={valgteKategorier}
              onToggle={(verdi) => oppdaterValg("kategori", verdi)}
            />
            <Filtergruppe
              tittel="Ytelse"
              verdier={filtervalg.ytelser}
              valgteVerdier={valgteYtelser}
              onToggle={(verdi) => oppdaterValg("ytelse", verdi)}
            />
          </div>
        </div>
      </VStack>

      <TildelSaksbehandlerModal
        sakId={sakSomTildeles?.id ?? ""}
        saksbehandlere={saksbehandlere}
        submitPath={submitPath}
        åpen={sakSomTildeles !== null}
        onClose={() => setSakSomTildeles(null)}
      />
    </section>
  );
}

function Oppsummeringskort({ tittel, children }: { tittel: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-ax-border-neutral-subtle bg-ax-bg-default p-5">
      <BodyShort size="small" className="mb-2 text-ax-text-neutral-subtle">
        {tittel}
      </BodyShort>
      <BodyShort className="font-medium text-ax-text-neutral">{children}</BodyShort>
    </div>
  );
}

function hentValgteVerdier(searchParams: URLSearchParams, nøkkel: "kategori" | "ytelse") {
  return searchParams.get(nøkkel)?.split(",").filter(Boolean) ?? [];
}

function hentSorteringskolonne(verdi: string | null): UfordeltSorteringskolonne | null {
  return ufordelteSorteringskolonner.includes(verdi as UfordeltSorteringskolonne)
    ? (verdi as UfordeltSorteringskolonne)
    : null;
}

function hentSorteringsretning(verdi: string | null): UfordeltSorteringsretning | null {
  return verdi === "stigende" || verdi === "synkende" ? verdi : null;
}

function hentStandardRetning(kolonne: UfordeltSorteringskolonne): UfordeltSorteringsretning {
  return kolonne === "opprettet" ? "synkende" : "stigende";
}

function KolonneOverskrift({
  children,
  tittel,
  kolonne,
  aktivKolonne,
  retning,
  onSort,
  className = "",
}: {
  children?: ReactNode;
  tittel?: string;
  kolonne?: UfordeltSorteringskolonne;
  aktivKolonne?: UfordeltSorteringskolonne | null;
  retning?: UfordeltSorteringsretning | null;
  onSort?: (kolonne: UfordeltSorteringskolonne) => void;
  className?: string;
}) {
  const erSorterbar = tittel && kolonne && onSort;
  const ariaSort =
    aktivKolonne === kolonne ? (retning === "stigende" ? "ascending" : "descending") : "none";

  return (
    <th
      scope="col"
      aria-sort={erSorterbar ? ariaSort : undefined}
      className={`px-5 py-4 text-left text-sm font-semibold text-ax-text-neutral ${className}`}
    >
      {erSorterbar ? (
        <button
          type="button"
          onClick={() => onSort(kolonne)}
          aria-label={`Sorter på ${tittel.toLowerCase()}`}
          className="inline-flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-left text-sm font-semibold text-ax-text-neutral hover:text-ax-text-accent focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ax-border-accent"
        >
          <span>{tittel}</span>
          <span aria-hidden className="text-xs text-ax-text-neutral-subtle">
            {aktivKolonne === kolonne ? (retning === "stigende" ? "▲" : "▼") : "↕"}
          </span>
        </button>
      ) : (
        children
      )}
    </th>
  );
}

function Celle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <td className={`px-5 py-4 align-middle text-sm text-ax-text-neutral ${className}`}>
      {children}
    </td>
  );
}

function Filtergruppe({
  tittel,
  verdier,
  valgteVerdier,
  onToggle,
}: {
  tittel: string;
  verdier: string[];
  valgteVerdier: string[];
  onToggle: (verdi: string) => void;
}) {
  return (
    <div>
      <Label size="small" spacing>
        {tittel}
      </Label>
      <Chips>
        {verdier.map((verdi) => (
          <Chips.Toggle
            key={verdi}
            selected={valgteVerdier.includes(verdi)}
            onClick={() => onToggle(verdi)}
          >
            {verdi}
          </Chips.Toggle>
        ))}
      </Chips>
    </div>
  );
}

function KategoriPille({ kategori }: { kategori: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${kategoriStiler.standard}`}
    >
      {kategori}
    </span>
  );
}

function YtelsePille({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md border border-ax-border-success bg-ax-bg-success-soft px-2.5 py-1 text-xs font-medium text-ax-text-success">
      {children}
    </span>
  );
}

const kategoriStiler: Record<string, string> = {
  Samliv: "border-ax-border-accent bg-ax-bg-accent-soft text-ax-text-accent",
  Arbeid: "border-ax-border-neutral bg-ax-bg-neutral-soft text-ax-text-neutral",
  Utland: "border-ax-border-warning bg-ax-bg-warning-soft text-ax-text-warning",
  Identitet: "border-ax-border-info bg-ax-bg-info-soft text-ax-text-info",
  Annet: "border-ax-border-danger bg-ax-bg-danger-soft text-ax-text-danger",
  Tiltak: "border-ax-border-success bg-ax-bg-success-soft text-ax-text-success",
  Dokumentfalsk: "border-ax-border-warning bg-ax-bg-warning-soft text-ax-text-warning",
  standard: "border-ax-border-neutral bg-ax-bg-neutral-soft text-ax-text-neutral",
};
