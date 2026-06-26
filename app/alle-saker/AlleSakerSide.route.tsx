// Alle saker-siden viser en paginert, filtrerbar og sorterbar saksliste.

import { Heading, HStack, Pagination, VStack } from "@navikt/ds-react";
import { useLoaderData, useSearchParams } from "react-router";
import { getBackendOboToken } from "~/auth/access-token";
import { skalBrukeMockdata } from "~/config/env.server";
import { hentKontrollsaker } from "~/fordeling/api.server";
import { parseMultiValueParam } from "~/filtre/parseMultiValueParam";
import { mapKontrollsakTilSakslisteRad } from "~/saker/saksliste/adaptere";
import { Saksliste } from "~/saker/saksliste/Saksliste";
import { RouteConfig } from "~/routeConfig";
import { getSaksenhet } from "~/saker/selectors";
import { hentAlleSaker } from "~/saker/mock-alle-saker.server";
import { paginerElementer } from "~/utils/paginering";
import {
  kontrollsakKategoriEtiketter,
  kontrollsakKategoriVerdier,
  kontrollsakMisbrukstypeEtiketter,
  kontrollsakMisbrukstypeVerdier,
} from "~/saker/kategorier";
import * as backendApi from "~/saker/api.server";
import { mockSaksbehandlerDetaljer } from "~/saker/mock-saksbehandlere.server";
import type { KontrollsakResponse } from "~/saker/types.backend";
import type { Route } from "./+types/AlleSakerSide.route";
import {
  type AlleSakerKolonne,
  filtrerSaker,
  normaliserFilterVerdier,
  type Sorteringsretning,
  sorteringskolonner,
  sorterSaker,
  unikeVerdier,
} from "./saker-utils";
import { Filtre } from "./Filtre";

const RADER_PER_SIDE = 20;
const STANDARD_KOLONNE: AlleSakerKolonne = "opprettet";
const STANDARD_RETNING: Sorteringsretning = "desc";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const side = Math.max(1, Number.parseInt(url.searchParams.get("side") ?? "1", 10) || 1);
  const sorterKolonne = parseKolonne(url.searchParams.get("sorter"));
  const sorterRetning = parseRetning(url.searchParams.get("retning"));

  const filterEnhet = normaliserFilterVerdier(parseMultiValueParam(url.searchParams, "enhet"));
  const filterSaksbehandler = url.searchParams.get("saksbehandler") ?? undefined;
  const filterKategori = normaliserFilterVerdier(parseMultiValueParam(url.searchParams, "kategori"));
  const filterMisbrukstype = normaliserFilterVerdier(
    parseMultiValueParam(url.searchParams, "misbrukstype"),
  );
  const filterMerking = normaliserFilterVerdier(parseMultiValueParam(url.searchParams, "merking"));

  const kategoriAlternativer = kontrollsakKategoriVerdier.map((v) => ({
    label: kontrollsakKategoriEtiketter[v],
    value: v,
  }));
  const misbrukstypeAlternativer = kontrollsakMisbrukstypeVerdier.map((v) => ({
    label: kontrollsakMisbrukstypeEtiketter[v],
    value: v,
  }));

  if (!skalBrukeMockdata) {
    const token = await getBackendOboToken(request);
    const [resultat, saksbehandlere] = await Promise.all([
      hentKontrollsaker({
        token,
        page: side,
        size: RADER_PER_SIDE,
        ansvarligNavIdent: filterSaksbehandler,
        kategori: filterKategori.length > 0 ? filterKategori : undefined,
        misbruktype: filterMisbrukstype.length > 0 ? filterMisbrukstype : undefined,
        merking: filterMerking.length > 0 ? filterMerking : undefined,
        enhet: filterEnhet.length > 0 ? filterEnhet : undefined,
      }),
      backendApi.hentSaksbehandlere(token),
    ]);

    const sorterteSaker = sorterSaker(resultat.items, sorterKolonne, sorterRetning);

    return {
      rader: sorterteSaker.map((sak) => mapKontrollsakTilSakslisteRad(sak)),
      aktivSide: resultat.page,
      totalSider: resultat.totalPages,
      totalAntall: resultat.totalItems,
      sorteringskolonne: sorterKolonne,
      sorteringsretning: sorterRetning,
      filterAlternativer: {
        enhet: [] as string[],
        saksbehandler: saksbehandlere.map((sb) => ({ label: sb.navn, value: sb.navIdent })),
        kategori: kategoriAlternativer,
        misbrukstype: misbrukstypeAlternativer,
        merking: [] as string[],
      },
    };
  }

  // Mock-sti: lokal filtrering, sortering og paginering
  const alleSaker: KontrollsakResponse[] = hentAlleSaker(request);

  const filtrerteSaker = filtrerSaker(alleSaker, {
    enhet: filterEnhet,
    saksbehandler: filterSaksbehandler ? [filterSaksbehandler] : [],
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
    filterAlternativer: {
      enhet: unikeVerdier(alleSaker.map(getSaksenhet)),
      saksbehandler: mockSaksbehandlerDetaljer.map((sb) => ({
        label: sb.navn,
        value: sb.navIdent,
      })),
      kategori: kategoriAlternativer,
      misbrukstype: misbrukstypeAlternativer,
      merking: unikeVerdier(alleSaker.flatMap((s) => s.merking)),
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
    <>
      <title>Alle saker – Watson Sak</title>
      <VStack gap="space-12" className="mt-4 mb-8">
        <Heading level="1" size="large">
          Alle saker
        </Heading>

        <section aria-labelledby="saksliste-heading">
          <Heading level="2" size="medium" spacing id="saksliste-heading">
            Saker
          </Heading>

          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:gap-8">
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
                  tilbake={{ to: RouteConfig.ALLE_SAKER, label: "Alle saker" }}
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

            <aside aria-label="Filtrer saker" className="xl:order-last xl:w-56 xl:shrink-0">
              <Filtre alternativer={filterAlternativer} />
            </aside>
          </div>
        </section>
      </VStack>
    </>
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
