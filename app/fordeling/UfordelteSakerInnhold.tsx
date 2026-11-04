import { Heading, HGrid, HStack, LocalAlert, Pagination, Select, VStack } from "@navikt/ds-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { ChipsFiltergruppe } from "~/filtre/ChipsFiltergruppe";
import { Filterpanel } from "~/filtre/Filterpanel";
import { useFilterParam } from "~/filtre/useFilterParam";
import { BackendUtilgjengeligMelding } from "~/komponenter/BackendUtilgjengeligMelding";
import { Nøkkeltallkort } from "~/komponenter/Nøkkeltallkort";
import { MiljøtilpassetTittel } from "~/layout/MiljøtilpassetTittel";
import { RouteConfig } from "~/routeConfig";
import { TildelSaksbehandlerModal } from "~/saker/handlinger/TildelSaksbehandlerModal";
import { mapFordelingSakTilSakslisteRad } from "~/saker/saksliste/adaptere";
import { AntallTreffEtikett } from "~/saker/saksliste/AntallTreffEtikett";
import { Saksliste } from "~/saker/saksliste/Saksliste";
import {
  ufordelteSorteringskolonner,
  type UfordeltSorteringskolonne,
  type UfordeltSorteringsretning,
  UFORDELTE_STEG,
} from "./ufordelte-saker";
import { parseSteg } from "~/saker/steg";
import { formaterSteg } from "~/saker/visning";
import type { KontrollsakSaksbehandler } from "~/saker/types.backend";
import type { FordelingSak } from "./typer";

const RESET_KEYS = ["side"];

interface UfordelteSakerInnholdProps {
  saker: FordelingSak[];
  enhet: string | null;
  saksbehandlere: string[];
  saksbehandlerDetaljer: KontrollsakSaksbehandler[];
  submitPath: string;
  saksdataUtilgjengelig: boolean;
  oppsummering: { antallSaker: number; eldsteLiggetidDager: number };
  paginering: { side: number; totalSider: number; totalAntall: number };
  valgtOmfang: string;
  organisasjonsvalg: { verdi: string; label: string; type: string }[];
  filtervalg: {
    kategorier: { verdi: string; etikett: string }[];
    misbrukstyper: { verdi: string; etikett: string }[];
    merkinger: { verdi: string; etikett: string }[];
  };
}

export function UfordelteSakerInnhold({
  saker,
  enhet,
  saksbehandlere,
  saksbehandlerDetaljer,
  submitPath,
  saksdataUtilgjengelig,
  oppsummering,
  paginering,
  valgtOmfang,
  organisasjonsvalg,
  filtervalg,
}: UfordelteSakerInnholdProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const kategoriFilter = useFilterParam("kategori", { resetKeys: RESET_KEYS });
  const misbrukstypeFilter = useFilterParam("misbrukstype", { resetKeys: RESET_KEYS });
  const merkingFilter = useFilterParam("merking", { resetKeys: RESET_KEYS });
  const stegFilter = useFilterParam("steg", { resetKeys: RESET_KEYS });

  const sorteringskolonne = hentSorteringskolonne(searchParams.get("sorter") ?? "opprettet");
  const sorteringsretning = hentSorteringsretning(searchParams.get("retning") ?? "synkende");

  const gyldigSteg = useMemo(
    () => parseSteg(stegFilter.valgteVerdier).filter((steg) => UFORDELTE_STEG.includes(steg)),
    [stegFilter.valgteVerdier],
  );
  const aktiveFiltreVerdier = [
    ...hentValgteEtiketter(kategoriFilter.valgteVerdier, filtervalg.kategorier),
    ...hentValgteEtiketter(misbrukstypeFilter.valgteVerdier, filtervalg.misbrukstyper),
    ...hentValgteEtiketter(merkingFilter.valgteVerdier, filtervalg.merkinger),
    ...gyldigSteg.map((steg) => formaterSteg(steg)),
  ];
  const filterTekst = aktiveFiltreVerdier.length > 0 ? aktiveFiltreVerdier.join(", ") : null;
  const overskriftUtenFilter = `Ufordelte saker i ${enhet ?? "hele organisasjonen"}`;
  const overskrift = filterTekst
    ? `${overskriftUtenFilter} – ${filterTekst}`
    : overskriftUtenFilter;
  const sakslisteRader = saker.map((sak) => mapFordelingSakTilSakslisteRad(sak));
  const modalKontekst = JSON.stringify([
    enhet,
    ...["omfang", "side", "kategori", "misbrukstype", "merking", "steg", "sorter", "retning"].map(
      (nøkkel) => [nøkkel, searchParams.getAll(nøkkel)],
    ),
  ]);
  // Valget gjelder bare konteksten det ble gjort i. Nullstiller modalen uten å remontere
  // liste og filtre, så tastaturfokus beholdes når filter, sortering eller side endres.
  const [tildeling, setTildeling] = useState<{ kontekst: string; sak: FordelingSak } | null>(null);
  const sakSomTildeles = tildeling?.kontekst === modalKontekst ? tildeling.sak : null;
  const søkestreng = searchParams.toString();
  const tilbakemål = {
    to: søkestreng ? `${RouteConfig.FORDELING}?${søkestreng}` : RouteConfig.FORDELING,
    label: "Ufordelte saker",
  };

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

  function velgOmfang(verdi: string) {
    setSearchParams((forrige) => {
      const neste = new URLSearchParams(forrige);
      neste.set("omfang", verdi);
      neste.delete("side");
      return neste;
    });
  }

  const harAktiveFiltre = aktiveFiltreVerdier.length > 0;

  return (
    <section aria-labelledby="ufordelte-saker-overskrift" className="pb-12">
      <MiljøtilpassetTittel>{`${overskrift} – Watson Sak`}</MiljøtilpassetTittel>
      <VStack gap="space-12" className="mt-4 mb-8">
        <HStack justify="space-between" align="center" gap="space-8" wrap>
          <Heading
            id="ufordelte-saker-overskrift"
            level="1"
            size="large"
            className="min-w-0 max-w-full break-words"
          >
            {overskrift}
          </Heading>
          {organisasjonsvalg.length > 1 && (
            <Select
              label="Vis"
              className="w-full self-start sm:w-auto sm:min-w-72"
              value={searchParams.get("omfang") ?? valgtOmfang}
              onChange={(event) => velgOmfang(event.target.value)}
            >
              {organisasjonsvalg.map((valg) => (
                <option key={valg.verdi} value={valg.verdi}>
                  {valg.label}
                </option>
              ))}
            </Select>
          )}
        </HStack>

        {!saksdataUtilgjengelig && (
          <HGrid columns={{ xs: 1, sm: "repeat(2, minmax(0, 15rem))" }} gap="space-12">
            <Nøkkeltallkort
              verdi={oppsummering.antallSaker}
              etikett="Ikke fordelt"
              forklaring="antall saker"
              farge="accent"
            />
            <Nøkkeltallkort
              verdi={oppsummering.eldsteLiggetidDager}
              etikett="Liggetid for eldste sak"
              forklaring="antall dager"
              farge="warning"
            />
          </HGrid>
        )}

        {saksdataUtilgjengelig ? (
          <BackendUtilgjengeligMelding />
        ) : (
          <>
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
              <div className="min-w-0">
                <AntallTreffEtikett antall={paginering.totalAntall} />
                {paginering.totalAntall === 0 ? (
                  <LocalAlert status="announcement">
                    <LocalAlert.Header>
                      <LocalAlert.Title as="h2">
                        {harAktiveFiltre
                          ? "Ingen saker passer filtreringen"
                          : "Ingen ufordelte saker"}
                      </LocalAlert.Title>
                    </LocalAlert.Header>
                    <LocalAlert.Content>
                      {harAktiveFiltre
                        ? "Endre filtrering for å finne saker."
                        : "Det er for øyeblikket ingen saker som venter på fordeling."}
                    </LocalAlert.Content>
                  </LocalAlert>
                ) : (
                  <div className="overflow-x-auto">
                    <Saksliste
                      rader={sakslisteRader}
                      kolonner={[
                        "saksid",
                        "kategori",
                        "misbrukstype",
                        "steg",
                        "status",
                        "opprettet",
                        "oppdatert",
                      ]}
                      tomTekst="Endre filtrering for å finne saker"
                      tilbake={tilbakemål}
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
                            const valgtSak = saker.find((sak) => sak.id === rad.id);

                            if (valgtSak) {
                              setTildeling({ kontekst: modalKontekst, sak: valgtSak });
                            }
                          }}
                          className="cursor-pointer border-none bg-transparent p-0 text-sm font-semibold text-ax-text-accent underline-offset-2 hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ax-border-accent"
                        >
                          Tildel
                        </button>
                      )}
                    />
                  </div>
                )}

                {paginering.totalSider > 1 && (
                  <HStack justify="center" className="mt-6">
                    <Pagination
                      page={paginering.side}
                      onPageChange={gåTilSide}
                      count={paginering.totalSider}
                      size="small"
                    />
                  </HStack>
                )}
              </div>

              <Filterpanel>
                <ChipsFiltergruppe
                  tittel="Steg"
                  alternativer={UFORDELTE_STEG.map((s) => ({
                    verdi: s,
                    etikett: formaterSteg(s),
                  }))}
                  valgteVerdier={stegFilter.valgteVerdier}
                  onToggle={(verdi) => {
                    sporHendelse("filter brukt", { filtergruppe: "steg", side: "fordeling" });
                    stegFilter.toggle(verdi);
                  }}
                  size="small"
                />
                {filtervalg.kategorier.length > 0 && (
                  <ChipsFiltergruppe
                    tittel="Kategori"
                    alternativer={filtervalg.kategorier}
                    valgteVerdier={kategoriFilter.valgteVerdier}
                    onToggle={(verdi) => {
                      sporHendelse("filter brukt", {
                        filtergruppe: "kategori",
                        side: "fordeling",
                      });
                      kategoriFilter.toggle(verdi);
                    }}
                    size="small"
                  />
                )}
                {filtervalg.misbrukstyper.length > 0 && (
                  <ChipsFiltergruppe
                    tittel="Misbrukstype"
                    alternativer={filtervalg.misbrukstyper}
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
                {filtervalg.merkinger.length > 0 && (
                  <ChipsFiltergruppe
                    tittel="Merking"
                    alternativer={filtervalg.merkinger}
                    valgteVerdier={merkingFilter.valgteVerdier}
                    onToggle={(verdi) => {
                      sporHendelse("filter brukt", {
                        filtergruppe: "merking",
                        side: "fordeling",
                      });
                      merkingFilter.toggle(verdi);
                    }}
                    size="small"
                  />
                )}
              </Filterpanel>
            </div>
            <TildelSaksbehandlerModal
              sakId={sakSomTildeles ? String(sakSomTildeles.id) : ""}
              saksbehandlere={saksbehandlere}
              saksbehandlerDetaljer={saksbehandlerDetaljer}
              submitPath={submitPath}
              åpen={sakSomTildeles !== null}
              onClose={() => setTildeling(null)}
            />
          </>
        )}
      </VStack>
    </section>
  );
}

function hentValgteEtiketter(
  valgteVerdier: string[],
  alternativer: { verdi: string; etikett: string }[],
) {
  const etiketter = new Map(alternativer.map(({ verdi, etikett }) => [verdi, etikett]));
  return valgteVerdier.map((verdi) => etiketter.get(verdi) ?? verdi);
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
