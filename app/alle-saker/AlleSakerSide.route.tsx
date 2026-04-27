// Alle saker-siden viser en oversikt over samtlige saker i systemet.
// Inneholder nøkkeltall, trakt-visualisering og en sorterbar, paginert saksliste.

import { ArrowsUpDownIcon } from "@navikt/aksel-icons";
import { Heading, HGrid, HStack, Page, Pagination, VStack } from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { useLoaderData, useSearchParams } from "react-router";
import { mapKontrollsakTilSakslisteRad } from "~/saker/saksliste/adaptere";
import { Saksliste } from "~/saker/saksliste/Saksliste";
import { getSaksreferanse } from "~/saker/id";
import {
  getKategoriText,
  getMisbrukstyper,
  getOppdatertDato,
  getOpprettetDato,
  getSaksenhet,
} from "~/saker/selectors";
import type { KontrollsakResponse, KontrollsakStatus } from "~/saker/types.backend";
import { formaterStatus, getStatus } from "~/saker/visning";
import { paginerElementer } from "~/fordeling/ufordelte-saker";
import { hentAlleSaker } from "~/saker/mock-alle-saker.server";
import type { Route } from "./+types/AlleSakerSide.route";
import { mockNokkeltall } from "./mock-data.server";
import { Filtre } from "./Filtre";
import { Nokkeltall } from "./Nokkeltall";
import { Trakt } from "./Trakt";

// Kolonner som støtter sortering
const sorteringskolonner = [
  "saksid",
  "kategori",
  "misbrukstype",
  "status",
  "opprettet",
  "oppdatert",
  "saksbehandler",
] as const;

type AlleSakerKolonne = (typeof sorteringskolonner)[number];
type Sorteringsretning = "asc" | "desc";

const RADER_PER_SIDE = 20;
const STANDARD_KOLONNE: AlleSakerKolonne = "opprettet";
const STANDARD_RETNING: Sorteringsretning = "desc";

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const side = Math.max(1, Number.parseInt(url.searchParams.get("side") ?? "1", 10) || 1);
  const sorterKolonne = parseKolonne(url.searchParams.get("sorter"));
  const sorterRetning = parseRetning(url.searchParams.get("retning"));

  const filterEnhet = normaliserFilterVerdier(url.searchParams.getAll("enhet"));
  const filterSaksbehandler = normaliserFilterVerdier(url.searchParams.getAll("saksbehandler"));
  const filterKategori = normaliserFilterVerdier(url.searchParams.getAll("kategori"));
  const filterMisbrukstype = normaliserFilterVerdier(url.searchParams.getAll("misbrukstype"));
  const filterMerking = normaliserFilterVerdier(url.searchParams.getAll("merking"));

  const alleSaker = hentAlleSaker();

  // Tilgjengelige filterverdier beregnes fra alle saker (uavhengig av aktivt filter)
  const filterAlternativer = {
    enhet: unikeVerdier(alleSaker.map(getSaksenhet)),
    saksbehandler: unikeVerdier(
      alleSaker.map((s) => s.saksbehandlere.eier?.navn).filter((n): n is string => !!n),
    ),
    kategori: unikeVerdier(
      alleSaker.map((s) => getKategoriText(s)).filter((k): k is string => !!k),
    ),
    misbrukstype: unikeVerdier(alleSaker.flatMap(getMisbrukstyper)),
    merking: unikeVerdier(alleSaker.map((s) => s.merking).filter((m): m is string => !!m)),
  };

  // Filtrering gjelder kun tabellen – nøkkeltall og trakt vises for alle saker
  const filtrerteSaker = filtrerSaker(alleSaker, {
    enhet: filterEnhet,
    saksbehandler: filterSaksbehandler,
    kategori: filterKategori,
    misbrukstype: filterMisbrukstype,
    merking: filterMerking,
  });

  const sorterteSaker = sorterSaker(filtrerteSaker, sorterKolonne, sorterRetning);
  const { elementer, aktivSide, totalSider } = paginerElementer(
    sorterteSaker,
    side,
    RADER_PER_SIDE,
  );

  return {
    rader: elementer.map((sak) => mapKontrollsakTilSakslisteRad(sak)),
    aktivSide,
    totalSider,
    totalAntall: filtrerteSaker.length,
    sorteringskolonne: sorterKolonne,
    sorteringsretning: sorterRetning,
    nokkeltall: mockNokkeltall,
    traktSteg: beregnTraktSteg(alleSaker),
    filterAlternativer,
    aktivtFilter: {
      enhet: filterEnhet,
      saksbehandler: filterSaksbehandler,
      kategori: filterKategori,
      misbrukstype: filterMisbrukstype,
      merking: filterMerking,
    },
  };
}

export default function AlleSakerSide() {
  const {
    rader,
    aktivSide,
    totalSider,
    sorteringskolonne,
    sorteringsretning,
    nokkeltall,
    traktSteg,
    filterAlternativer,
    aktivtFilter,
  } = useLoaderData<typeof loader>();

  const [, setSearchParams] = useSearchParams();
  function gåTilSide(side: number) {
    setSearchParams((forrige) => {
      const neste = new URLSearchParams(forrige);
      neste.set("side", String(side));
      return neste;
    });
  }

  function sorterPåKolonne(kolonne: AlleSakerKolonne) {
    setSearchParams((forrige) => {
      const neste = new URLSearchParams(forrige);
      const nesteRetning: Sorteringsretning =
        sorteringskolonne === kolonne
          ? sorteringsretning === "asc"
            ? "desc"
            : "asc"
          : standardRetningForKolonne(kolonne);

      neste.set("sorter", kolonne);
      neste.set("retning", nesteRetning);
      neste.delete("side");
      return neste;
    });
  }

  function ariaSort(kolonne: AlleSakerKolonne): "ascending" | "descending" | "none" {
    if (sorteringskolonne !== kolonne) return "none";
    return sorteringsretning === "asc" ? "ascending" : "descending";
  }

  return (
    <Page>
      <title>Alle saker – Watson Sak</title>
      <PageBlock width="2xl" gutters className="!mx-0">
        <VStack gap="space-12" className="mt-4 mb-8">
          <Heading level="1" size="large">
            Alle saker
          </Heading>

          {/* Seksjon 1 + 2: Nøkkeltall og trakt side om side på md+ */}
          <HGrid columns={{ xs: 1, md: 2 }} gap="space-6">
            <section
              aria-labelledby="nokkeltall-heading"
              className="rounded-2xl border border-ax-border-neutral-subtle bg-ax-bg-default p-6"
            >
              <Heading level="2" size="medium" spacing id="nokkeltall-heading">
                Nøkkeltall
              </Heading>
              <Nokkeltall {...nokkeltall} />
            </section>

            <section
              aria-labelledby="trakt-heading"
              className="rounded-2xl border border-ax-border-neutral-subtle bg-ax-bg-default p-6"
            >
              <Heading level="2" size="medium" spacing id="trakt-heading">
                Saker per steg
              </Heading>
              <Trakt steg={traktSteg} />
            </section>
          </HGrid>

          {/* Seksjon 3: Saksliste med filtre */}
          <section aria-labelledby="saksliste-heading">
            <Heading level="2" size="medium" spacing id="saksliste-heading">
              Saker
            </Heading>

            {/* Responsiv layout: filtre over tabellen på small, til høyre på xl+ */}
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:gap-8">
              {/* Tabell med paginering */}
              <div className="min-w-0 flex-1 xl:order-first">
                <div className="overflow-x-auto [&_table]:w-full">
                  <Saksliste
                    rader={rader}
                    kolonner={[
                      "saksid",
                      "kategori",
                      "misbrukstype",
                      "status",
                      "opprettet",
                      "oppdatert",
                      "saksbehandler",
                    ]}
                    tomTekst="Ingen saker funnet."
                    kolonneHeaderInnhold={{
                      saksid: (
                        <KolonneSorteringsknapp
                          tittel="Saksid"
                          kolonne="saksid"
                          aktivKolonne={sorteringskolonne}
                          onSort={sorterPåKolonne}
                        />
                      ),
                      kategori: (
                        <KolonneSorteringsknapp
                          tittel="Kategori"
                          kolonne="kategori"
                          aktivKolonne={sorteringskolonne}
                          onSort={sorterPåKolonne}
                        />
                      ),
                      misbrukstype: (
                        <KolonneSorteringsknapp
                          tittel="Misbrukstype"
                          kolonne="misbrukstype"
                          aktivKolonne={sorteringskolonne}
                          onSort={sorterPåKolonne}
                        />
                      ),
                      status: (
                        <KolonneSorteringsknapp
                          tittel="Status"
                          kolonne="status"
                          aktivKolonne={sorteringskolonne}
                          onSort={sorterPåKolonne}
                        />
                      ),
                      opprettet: (
                        <KolonneSorteringsknapp
                          tittel="Opprettet"
                          kolonne="opprettet"
                          aktivKolonne={sorteringskolonne}
                          onSort={sorterPåKolonne}
                        />
                      ),
                      oppdatert: (
                        <KolonneSorteringsknapp
                          tittel="Sist endret"
                          kolonne="oppdatert"
                          aktivKolonne={sorteringskolonne}
                          onSort={sorterPåKolonne}
                        />
                      ),
                      saksbehandler: (
                        <KolonneSorteringsknapp
                          tittel="Saksbehandler"
                          kolonne="saksbehandler"
                          aktivKolonne={sorteringskolonne}
                          onSort={sorterPåKolonne}
                        />
                      ),
                    }}
                    kolonneHeaderProps={{
                      saksid: { "aria-sort": ariaSort("saksid"), className: "min-w-[100px] !py-5" },
                      kategori: {
                        "aria-sort": ariaSort("kategori"),
                        className: "min-w-[165px] !py-5",
                      },
                      misbrukstype: {
                        "aria-sort": ariaSort("misbrukstype"),
                        className: "min-w-[210px] !py-5",
                      },
                      status: { "aria-sort": ariaSort("status"), className: "min-w-[200px] !py-5" },
                      opprettet: {
                        "aria-sort": ariaSort("opprettet"),
                        className: "min-w-[140px] !py-5",
                      },
                      oppdatert: {
                        "aria-sort": ariaSort("oppdatert"),
                        className: "min-w-[140px] !py-5",
                      },
                      saksbehandler: {
                        "aria-sort": ariaSort("saksbehandler"),
                        className: "min-w-[165px] !py-5",
                      },
                    }}
                  />
                </div>

                {totalSider > 1 && (
                  <HStack justify="center" className="mt-6">
                    <Pagination
                      page={aktivSide}
                      onPageChange={gåTilSide}
                      count={totalSider}
                      size="small"
                    />
                  </HStack>
                )}
              </div>

              {/* Filterpanel: horisontalt wrapping over tabellen på small, vertikal kolonne til høyre på xl+ */}
              <aside aria-label="Filtrer saker" className="xl:order-last xl:w-56 xl:shrink-0">
                <Filtre alternativer={filterAlternativer} aktivtFilter={aktivtFilter} />
              </aside>
            </div>
          </section>
        </VStack>
      </PageBlock>
    </Page>
  );
}

// ─── Hjelpefunksjoner ───────────────────────────────────────────────────────

// Rekkefølgen statuser skal vises i trakten (prosesskjede-rekkefølge)
const TRAKT_STATUS_REKKEFOLGE: KontrollsakStatus[] = [
  "OPPRETTET",
  "UTREDES",
  "VENTER_PA_INFORMASJON",
  "VENTER_PA_VEDTAK",
  "ANMELDELSE_VURDERES",
  "ANMELDT",
  "AVSLUTTET",
  "HENLAGT",
];

function beregnTraktSteg(saker: KontrollsakResponse[]) {
  const teller = new Map<KontrollsakStatus, number>();
  for (const sak of saker) {
    teller.set(sak.status, (teller.get(sak.status) ?? 0) + 1);
  }
  return TRAKT_STATUS_REKKEFOLGE.filter((status) => (teller.get(status) ?? 0) > 0).map(
    (status) => ({ label: formaterStatus(status), antall: teller.get(status) ?? 0 }),
  );
}

function parseKolonne(verdi: string | null): AlleSakerKolonne {
  return sorteringskolonner.includes(verdi as AlleSakerKolonne)
    ? (verdi as AlleSakerKolonne)
    : STANDARD_KOLONNE;
}

function parseRetning(verdi: string | null): Sorteringsretning {
  return verdi === "asc" || verdi === "desc" ? verdi : STANDARD_RETNING;
}

function standardRetningForKolonne(kolonne: AlleSakerKolonne): Sorteringsretning {
  return kolonne === "opprettet" || kolonne === "oppdatert" ? "desc" : "asc";
}

function normaliserFilterVerdier(verdier: string[]): string[] {
  return [...new Set(verdier.filter((v) => v.trim() !== ""))];
}

function unikeVerdier(verdier: string[]): string[] {
  return [...new Set(verdier.filter(Boolean))].sort((a, b) => a.localeCompare(b, "nb"));
}

type FilterState = {
  enhet: string[];
  saksbehandler: string[];
  kategori: string[];
  misbrukstype: string[];
  merking: string[];
};

function filtrerSaker(saker: KontrollsakResponse[], filter: FilterState): KontrollsakResponse[] {
  return saker.filter((sak) => {
    if (filter.enhet.length > 0 && !filter.enhet.includes(getSaksenhet(sak))) return false;
    if (
      filter.saksbehandler.length > 0 &&
      !filter.saksbehandler.includes(sak.saksbehandlere.eier?.navn ?? "")
    )
      return false;
    if (filter.kategori.length > 0 && !filter.kategori.includes(getKategoriText(sak) ?? ""))
      return false;
    if (
      filter.misbrukstype.length > 0 &&
      !getMisbrukstyper(sak).some((m) => filter.misbrukstype.includes(m))
    )
      return false;
    if (filter.merking.length > 0 && !filter.merking.includes(sak.merking ?? "")) return false;
    return true;
  });
}

function sorterSaker(
  saker: KontrollsakResponse[],
  kolonne: AlleSakerKolonne,
  retning: Sorteringsretning,
): KontrollsakResponse[] {
  const faktor = retning === "asc" ? 1 : -1;

  return [...saker].sort((a, b) => {
    const verdiA = hentSorteringsverdi(a, kolonne);
    const verdiB = hentSorteringsverdi(b, kolonne);
    return verdiA.localeCompare(verdiB, "nb", { sensitivity: "base" }) * faktor;
  });
}

function hentSorteringsverdi(sak: KontrollsakResponse, kolonne: AlleSakerKolonne): string {
  switch (kolonne) {
    case "saksid":
      return getSaksreferanse(sak.id);
    case "kategori":
      return getKategoriText(sak) ?? "";
    case "misbrukstype":
      return getMisbrukstyper(sak).join(", ");
    case "status":
      return getStatus(sak);
    case "opprettet":
      return getOpprettetDato(sak);
    case "oppdatert":
      return getOppdatertDato(sak);
    case "saksbehandler":
      return sak.saksbehandlere.eier?.navn ?? "";
  }
}

// ─── Interne komponenter ────────────────────────────────────────────────────

function KolonneSorteringsknapp({
  tittel,
  kolonne,
  aktivKolonne,
  onSort,
}: {
  tittel: string;
  kolonne: AlleSakerKolonne;
  aktivKolonne: AlleSakerKolonne;
  onSort: (kolonne: AlleSakerKolonne) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSort(kolonne)}
      aria-label={`Sorter på ${tittel.toLowerCase()}`}
      className="inline-flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-left text-base font-semibold text-ax-text-accent-subtle hover:text-ax-text-accent focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ax-border-accent"
    >
      <span>{tittel}</span>
      <ArrowsUpDownIcon
        aria-hidden
        fontSize="1rem"
        className={aktivKolonne === kolonne ? "text-ax-text-accent" : "text-ax-text-accent-subtle"}
      />
    </button>
  );
}
