// Alle saker-siden viser en oversikt over samtlige saker i systemet.
// Inneholder nøkkeltall, trakt-visualisering og en sorterbar, paginert saksliste.

import { Heading, HGrid, HStack, Page, Pagination, VStack } from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { useLoaderData, useSearchParams } from "react-router";
import { skalBrukeMockdata } from "~/config/env.server";
import { mapKontrollsakTilSakslisteRad } from "~/saker/saksliste/adaptere";
import { Saksliste } from "~/saker/saksliste/Saksliste";
import { getKategoriText, getMisbrukstyper, getSaksenhet } from "~/saker/selectors";
import { hentAlleSaker } from "~/saker/mock-alle-saker.server";
import { paginerElementer } from "~/utils/paginering";
import type { Route } from "./+types/AlleSakerSide.route";
import { mockNokkeltall } from "./mock-data.server";
import { parseMultiValueParam } from "~/filtre/parseMultiValueParam";
import {
  type AlleSakerKolonne,
  beregnTraktSteg,
  filtrerSaker,
  normaliserFilterVerdier,
  type Sorteringsretning,
  sorteringskolonner,
  sorterSaker,
  unikeVerdier,
} from "./saker-utils";
import { Filtre } from "./Filtre";
import { Nokkeltall } from "./Nokkeltall";
import { Trakt } from "./Trakt";

const RADER_PER_SIDE = 20;
const STANDARD_KOLONNE: AlleSakerKolonne = "opprettet";
const STANDARD_RETNING: Sorteringsretning = "desc";

export function loader({ request }: Route.LoaderArgs) {
  if (!skalBrukeMockdata) {
    throw new Response("Alle saker er ikke tilgjengelig uten mockdata", {
      status: 501,
    });
  }

  const url = new URL(request.url);
  const side = Math.max(1, Number.parseInt(url.searchParams.get("side") ?? "1", 10) || 1);
  const sorterKolonne = parseKolonne(url.searchParams.get("sorter"));
  const sorterRetning = parseRetning(url.searchParams.get("retning"));

  const filterEnhet = normaliserFilterVerdier(parseMultiValueParam(url.searchParams, "enhet"));
  const filterSaksbehandler = normaliserFilterVerdier(
    parseMultiValueParam(url.searchParams, "saksbehandler"),
  );
  const filterKategori = normaliserFilterVerdier(
    parseMultiValueParam(url.searchParams, "kategori"),
  );
  const filterMisbrukstype = normaliserFilterVerdier(
    parseMultiValueParam(url.searchParams, "misbrukstype"),
  );
  const filterMerking = normaliserFilterVerdier(parseMultiValueParam(url.searchParams, "merking"));

  const alleSaker = hentAlleSaker(request);

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

  return (
    <Page>
      <title>Alle saker – Watson Sak</title>
      <PageBlock width="2xl" gutters className="mx-0!">
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
                    sortering={{
                      kolonne: sorteringskolonne,
                      retning: sorteringsretning === "asc" ? "stigende" : "synkende",
                      onSort: (kolonne) => sorterPåKolonne(kolonne as AlleSakerKolonne),
                      sorterbare: [...sorteringskolonner],
                    }}
                    kolonneHeaderProps={{
                      saksid: { className: "min-w-[100px] !py-5" },
                      kategori: { className: "min-w-[165px] !py-5" },
                      misbrukstype: { className: "min-w-[210px] !py-5" },
                      status: { className: "min-w-[200px] !py-5" },
                      opprettet: { className: "min-w-[140px] !py-5" },
                      oppdatert: { className: "min-w-[140px] !py-5" },
                      saksbehandler: { className: "min-w-[165px] !py-5" },
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
                <Filtre alternativer={filterAlternativer} />
              </aside>
            </div>
          </section>
        </VStack>
      </PageBlock>
    </Page>
  );
}

// ─── Hjelpefunksjoner ───────────────────────────────────────────────────────

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
