import { BodyShort, Heading, HStack, Pagination, VStack } from "@navikt/ds-react";
import { useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import { ChipsFiltergruppe } from "~/filtre/ChipsFiltergruppe";
import { Filterpanel } from "~/filtre/Filterpanel";
import { useFilterParam } from "~/filtre/useFilterParam";
import { RouteConfig } from "~/routeConfig";
import { TildelSaksbehandlerModal } from "~/saker/handlinger/TildelSaksbehandlerModal";
import { mapFordelingSakTilSakslisteRad } from "~/saker/saksliste/adaptere";
import { Saksliste } from "~/saker/saksliste/Saksliste";
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
import type { KontrollsakSaksbehandler } from "~/saker/types.backend";
import type { FordelingSak } from "./typer";

const antallPerSide = 6;
const RESET_KEYS = ["side"];

interface UfordelteSakerInnholdProps {
  saker: FordelingSak[];
  saksbehandlere: string[];
  saksbehandlerDetaljer?: KontrollsakSaksbehandler[];
  submitPath?: string;
}

export function UfordelteSakerInnhold({
  saker,
  saksbehandlere,
  saksbehandlerDetaljer,
  submitPath = RouteConfig.FORDELING,
}: UfordelteSakerInnholdProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sakSomTildeles, setSakSomTildeles] = useState<FordelingSak | null>(null);

  const kategoriFilter = useFilterParam("kategori", { resetKeys: RESET_KEYS });
  const ytelseFilter = useFilterParam("ytelse", { resetKeys: RESET_KEYS });

  const valgtSide = Number.parseInt(searchParams.get("side") ?? "1", 10) || 1;
  const sorteringskolonne = hentSorteringskolonne(searchParams.get("sorter"));
  const sorteringsretning = hentSorteringsretning(searchParams.get("retning"));

  const filtervalg = useMemo(() => hentUfordelteFiltervalg(saker), [saker]);
  const filtrerteSaker = useMemo(
    () =>
      filtrerUfordelteSaker(saker, {
        kategorier: kategoriFilter.valgteVerdier,
        ytelser: ytelseFilter.valgteVerdier,
      }),
    [saker, kategoriFilter.valgteVerdier, ytelseFilter.valgteVerdier],
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
  const sakslisteRader = useMemo(
    () => paginerteSaker.elementer.map((sak) => mapFordelingSakTilSakslisteRad(sak)),
    [paginerteSaker.elementer],
  );

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
                <Saksliste
                  rader={sakslisteRader}
                  kolonner={[
                    "saksid",
                    "kategori",
                    "misbrukstype",
                    "status",
                    "opprettet",
                    "oppdatert",
                  ]}
                  tomTekst="Ingen ufordelte saker matcher filtrene."
                  handlingKolonneTittel={<span className="sr-only">Handling</span>}
                  sortering={{
                    kolonne: sorteringskolonne,
                    retning: sorteringsretning,
                    onSort: (kolonne) => sorterPåKolonne(kolonne as UfordeltSorteringskolonne),
                    sorterbare: [...ufordelteSorteringskolonner],
                  }}
                  renderRadHandling={(rad) => (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        const valgtSak = paginerteSaker.elementer.find((sak) => sak.id === rad.id);

                        if (valgtSak) {
                          setSakSomTildeles(valgtSak);
                        }
                      }}
                      className="cursor-pointer border-none bg-transparent p-0 text-sm font-semibold text-ax-text-accent underline-offset-2 hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ax-border-accent"
                    >
                      Tildel
                    </button>
                  )}
                />
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

          <Filterpanel>
            <ChipsFiltergruppe
              tittel="Kategori"
              alternativer={filtervalg.kategorier.map((v) => ({ verdi: v, etikett: v }))}
              valgteVerdier={kategoriFilter.valgteVerdier}
              onToggle={kategoriFilter.toggle}
              size="small"
            />
            <ChipsFiltergruppe
              tittel="Ytelse"
              alternativer={filtervalg.ytelser.map((v) => ({ verdi: v, etikett: v }))}
              valgteVerdier={ytelseFilter.valgteVerdier}
              onToggle={ytelseFilter.toggle}
              size="small"
            />
          </Filterpanel>
        </div>
      </VStack>

      <TildelSaksbehandlerModal
        sakId={sakSomTildeles ? String(sakSomTildeles.id) : ""}
        saksbehandlere={saksbehandlere}
        saksbehandlerDetaljer={saksbehandlerDetaljer}
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

function hentSorteringskolonne(verdi: string | null): UfordeltSorteringskolonne | null {
  return ufordelteSorteringskolonner.includes(verdi as UfordeltSorteringskolonne)
    ? (verdi as UfordeltSorteringskolonne)
    : null;
}

function hentSorteringsretning(verdi: string | null): UfordeltSorteringsretning | null {
  return verdi === "stigende" || verdi === "synkende" ? verdi : null;
}

function hentStandardRetning(kolonne: UfordeltSorteringskolonne): UfordeltSorteringsretning {
  switch (kolonne) {
    case "opprettet":
    case "oppdatert":
      return "synkende";
    default:
      return "stigende";
  }
}
