import { BodyShort, Heading, HStack, LocalAlert, Pagination, VStack } from "@navikt/ds-react";
import { useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { ChipsFiltergruppe } from "~/filtre/ChipsFiltergruppe";
import { Filterpanel } from "~/filtre/Filterpanel";
import { useFilterParam } from "~/filtre/useFilterParam";
import { MiljøtilpassetTittel } from "~/layout/MiljøtilpassetTittel";
import { RouteConfig } from "~/routeConfig";
import { TildelSaksbehandlerModal } from "~/saker/handlinger/TildelSaksbehandlerModal";
import { mapFordelingSakTilSakslisteRad } from "~/saker/saksliste/adaptere";
import { AntallTreffEtikett } from "~/saker/saksliste/AntallTreffEtikett";
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
import { ALLE_STATUSER, parseStatuser } from "~/saker/status";
import { formaterStatus } from "~/saker/visning";
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
  const misbrukstypeFilter = useFilterParam("misbrukstype", { resetKeys: RESET_KEYS });
  const merkingFilter = useFilterParam("merking", { resetKeys: RESET_KEYS });
  const statusFilter = useFilterParam("status", { resetKeys: RESET_KEYS });

  const valgtSide = Number.parseInt(searchParams.get("side") ?? "1", 10) || 1;
  const sorteringskolonne = hentSorteringskolonne(searchParams.get("sorter"));
  const sorteringsretning = hentSorteringsretning(searchParams.get("retning"));

  const filtervalg = useMemo(() => hentUfordelteFiltervalg(saker), [saker]);
  const aktiveFiltreVerdier = [
    ...kategoriFilter.valgteVerdier,
    ...misbrukstypeFilter.valgteVerdier,
    ...merkingFilter.valgteVerdier,
    ...statusFilter.valgteVerdier,
  ];
  const filterTekst = aktiveFiltreVerdier.length > 0 ? aktiveFiltreVerdier.join(", ") : null;
  const overskrift = filterTekst ? `Ufordelte saker – ${filterTekst}` : "Ufordelte saker";
  const filtrerteSaker = useMemo(
    () =>
      filtrerUfordelteSaker(saker, {
        kategorier: kategoriFilter.valgteVerdier,
        misbrukstyper: misbrukstypeFilter.valgteVerdier,
        merkinger: merkingFilter.valgteVerdier,
        statuser: parseStatuser(statusFilter.valgteVerdier),
      }),
    [
      saker,
      kategoriFilter.valgteVerdier,
      misbrukstypeFilter.valgteVerdier,
      merkingFilter.valgteVerdier,
      statusFilter.valgteVerdier,
    ],
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

  const harSaker = saker.length > 0;

  return (
    <section aria-labelledby="ufordelte-saker-overskrift" className="pb-12">
      <MiljøtilpassetTittel>
        {filterTekst ? `${overskrift} – Watson Sak` : "Ufordelte saker – Watson Sak"}
      </MiljøtilpassetTittel>
      <VStack gap="space-12" className="mt-4 mb-8">
        <Heading id="ufordelte-saker-overskrift" level="1" size="large">
          {overskrift}
        </Heading>

        {harSaker && (
          <div className="grid max-w-4xl gap-4 md:grid-cols-3">
            <Oppsummeringskort tittel="Antall">{oppsummering.antallTekst}</Oppsummeringskort>
            <Oppsummeringskort tittel="Liggetid">{oppsummering.eldsteTekst}</Oppsummeringskort>
            <Oppsummeringskort tittel="Ytelser">{oppsummering.ytelserTekst}</Oppsummeringskort>
          </div>
        )}

        {!harSaker ? (
          <LocalAlert status="announcement">
            <LocalAlert.Header>
              <LocalAlert.Title as="h2">Ingen ufordelte saker</LocalAlert.Title>
            </LocalAlert.Header>
            <LocalAlert.Content>
              Det er for øyeblikket ingen saker som venter på fordeling.
            </LocalAlert.Content>
          </LocalAlert>
        ) : (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
            <div className="min-w-0">
              <div className="overflow-x-auto">
                <AntallTreffEtikett antall={filtrerteSaker.length} />
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
                  tomTekst="Endre filtrering for å finne saker"
                  tilbake={{ to: RouteConfig.FORDELING, label: "Fordeling" }}
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
              {filtervalg.kategorier.length > 0 && (
                <ChipsFiltergruppe
                  tittel="Kategori"
                  alternativer={filtervalg.kategorier.map((v) => ({ verdi: v, etikett: v }))}
                  valgteVerdier={kategoriFilter.valgteVerdier}
                  onToggle={(verdi) => {
                    sporHendelse("filter brukt", { filtergruppe: "kategori", side: "fordeling" });
                    kategoriFilter.toggle(verdi);
                  }}
                  size="small"
                />
              )}
              {filtervalg.misbrukstyper.length > 0 && (
                <ChipsFiltergruppe
                  tittel="Misbrukstype"
                  alternativer={filtervalg.misbrukstyper.map((v) => ({ verdi: v, etikett: v }))}
                  valgteVerdier={misbrukstypeFilter.valgteVerdier}
                  onToggle={(verdi) => {
                    sporHendelse("filter brukt", {
                      filtergruppe: "misbrukstype",
                      side: "fordeling",
                    });
                    misbrukstypeFilter.toggle(verdi);
                  }}
                  size="small"
                />
              )}
              <ChipsFiltergruppe
                tittel="Status"
                alternativer={ALLE_STATUSER.map((s) => ({ verdi: s, etikett: formaterStatus(s) }))}
                valgteVerdier={statusFilter.valgteVerdier}
                onToggle={(verdi) => {
                  sporHendelse("filter brukt", { filtergruppe: "status", side: "fordeling" });
                  statusFilter.toggle(verdi);
                }}
                size="small"
              />
              {filtervalg.merkinger.length > 0 && (
                <ChipsFiltergruppe
                  tittel="Merking"
                  alternativer={filtervalg.merkinger.map((v) => ({ verdi: v, etikett: v }))}
                  valgteVerdier={merkingFilter.valgteVerdier}
                  onToggle={(verdi) => {
                    sporHendelse("filter brukt", { filtergruppe: "merking", side: "fordeling" });
                    merkingFilter.toggle(verdi);
                  }}
                  size="small"
                />
              )}
            </Filterpanel>
          </div>
        )}
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
