import { FileXMarkIcon, MagnifyingGlassIcon } from "@navikt/aksel-icons";
import { BodyShort, Box, Button, Heading, HStack, Pagination, Tag, VStack } from "@navikt/ds-react";
import { useRef, useState } from "react";
import { data, Link, unstable_useRoute, useActionData, useFetcher } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { Innsendingsfeil } from "~/feilhåndtering/Innsendingsfeil";
import { INNSENDINGSFEIL } from "~/feilhåndtering/feilmeldinger";
import { tekniskFeilSvar } from "~/feilhåndtering/teknisk-feil.server";
import { MiljøtilpassetTittel } from "~/layout/MiljøtilpassetTittel";
import { RouteConfig } from "~/routeConfig";
import { mapKontrollsakTilSakslisteRad } from "~/saker/saksliste/adaptere";
import { Saksliste } from "~/saker/saksliste/Saksliste";
import {
  erSorterbarSakskolonne,
  SAKSLISTE_OPPSETT,
  SORTERBARE_SAKSKOLONNER,
  STANDARD_SAKSSORTERING,
  standardRetningForKolonne,
  type Sakssortering,
} from "~/saker/saksliste/oppsett";
import { sorterSaker } from "~/alle-saker/saker-utils";
import {
  erDnummer,
  formaterFødselsnummer,
  formaterOrganisasjonsnummer,
} from "~/utils/string-utils";
import { hentValgfriTekst } from "~/utils/form-data";
import { søkSaker, type SøkeType } from "./søk.server";
import { HURTIGSØK_INPUT_SELECTOR } from "./sok-navigasjon";
import type { Route } from "./+types/SøkSide.route";

export const handle = { bredPageBlock: true };

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const søketekst = hentValgfriTekst(formData, "søketekst") ?? "";
  const side = Number(formData.get("side") ?? "1") || 1;

  if (!søketekst.trim()) {
    return {
      søketekst: "",
      søketype: "ukjent" as SøkeType,
      resultater: [],
      side: 1,
      totalSider: 1,
      totalAntall: 0,
    };
  }

  try {
    return await søkSaker(request, søketekst, side);
  } catch (feil) {
    const svar = tekniskFeilSvar(feil, { kontekst: "søke", request });
    return data(
      {
        ...svar.data,
        søketekst,
        søketype: "ukjent" as SøkeType,
        resultater: undefined,
        side: 1,
        totalSider: 1,
        totalAntall: 0,
      },
      svar.init ?? { status: 500 },
    );
  }
}

function hentResultatlenker(container: HTMLElement | null): HTMLAnchorElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLAnchorElement>("a"));
}

function TomStatusboks({
  ikon,
  tittel,
  beskrivelse,
  children,
}: {
  ikon: React.ReactNode;
  tittel?: string;
  beskrivelse: string;
  children?: React.ReactNode;
}) {
  return (
    <Box background="neutral-soft" borderRadius="8" padding="space-40">
      <VStack gap="space-16" align="center">
        <Box background="neutral-moderate" borderRadius="full" padding="space-16">
          {ikon}
        </Box>
        <VStack gap="space-4" align="center">
          {tittel && (
            <Heading level="2" size="small" align="center">
              {tittel}
            </Heading>
          )}
          <BodyShort align="center" className="text-ax-text-neutral-subtle max-w-md">
            {beskrivelse}
          </BodyShort>
        </VStack>
        {children}
      </VStack>
    </Box>
  );
}

function SøkeVeiledning() {
  return (
    <TomStatusboks
      ikon={
        <MagnifyingGlassIcon aria-hidden fontSize="2rem" className="text-ax-icon-neutral-subtle" />
      }
      tittel="Finn en sak"
      beskrivelse="Bruk søkefeltet i toppmenyen for å søke etter saksnummer, PID, fødsels- eller d-nummer eller organisasjonsnummer."
    >
      <HStack gap="space-8" justify="center" wrap>
        <Tag variant="neutral" size="small">
          Saksnummer
        </Tag>
        <Tag variant="neutral" size="small">
          PID
        </Tag>
        <Tag variant="neutral" size="small">
          Fødsels- eller d-nummer
        </Tag>
        <Tag variant="neutral" size="small">
          Organisasjonsnummer
        </Tag>
      </HStack>
    </TomStatusboks>
  );
}

function IngenTreff({ tittel, beskrivelse }: { tittel?: string; beskrivelse: string }) {
  return (
    <TomStatusboks
      ikon={<FileXMarkIcon aria-hidden fontSize="2rem" className="text-ax-icon-neutral-subtle" />}
      tittel={tittel}
      beskrivelse={beskrivelse}
    >
      <Button
        as={Link}
        to={RouteConfig.ALLE_SAKER}
        variant="secondary"
        size="small"
        onClick={() => sporHendelse("søk se alle saker klikket")}
      >
        Se alle saker
      </Button>
    </TomStatusboks>
  );
}

function tomTreffTekst(
  søketype: SøkeType,
  søketekst: string,
): { tittel?: string; beskrivelse: string } {
  switch (søketype) {
    case "saksnummer":
      return {
        tittel: `Fant ingen sak med saksnummer eller PID «${søketekst}»`,
        beskrivelse:
          "Sjekk at saksnummeret eller PID-en er riktig, eller søk på fødsels- eller d-nummer eller organisasjonsnummer.",
      };
    case "organisasjonsnummer":
      return {
        tittel: `Ingen treff for organisasjonsnummer «${formaterOrganisasjonsnummer(søketekst)}»`,
        beskrivelse: "Fant ingen kontrollsaker knyttet til dette organisasjonsnummeret.",
      };
    case "personIdent":
      return {
        tittel: `Ingen treff for «${søketekst}»`,
        beskrivelse: "Fant ingen kontrollsaker for dette fødsels- eller d-nummeret.",
      };
    default:
      return {
        beskrivelse:
          "Søket må være et fødsels- eller d-nummer (11 sifre), organisasjonsnummer (9 sifre), saksnummer eller PID.",
      };
  }
}

export default function SøkSide() {
  const actionData = useActionData<typeof action>();
  const [søk, setSøk] = useState({ actionData, versjon: 0 });

  // Nytt action-svar nullstiller både sortering og side-fetcher, også ved identisk søketekst.
  if (søk.actionData !== actionData) {
    setSøk({ actionData, versjon: søk.versjon + 1 });
  }

  return <SøkInnhold key={søk.versjon} actionData={actionData} søkVersjon={søk.versjon} />;
}

function SøkInnhold({
  actionData,
  søkVersjon,
}: {
  actionData: ReturnType<typeof useActionData<typeof action>>;
  søkVersjon: number;
}) {
  // Hver innsending får egen fetcher, slik at gamle sider ikke lekker inn i neste søk.
  const fetcher = useFetcher<typeof action>({
    key: `sok-side-${søkVersjon}-${actionData?.søketekst ?? ""}`,
  });
  const forhåndsutfyllFetcher = useFetcher<{ teknisk?: boolean; feilId?: string }>();
  const { loaderData } = unstable_useRoute("root");
  const watsonSokUrl = loaderData?.envs.watsonSokUrl ?? null;
  const erLesebruker = loaderData?.user.erLesebruker === true;

  const visteData = fetcher.data ?? actionData;

  const søketekst = visteData?.søketekst ?? "";
  const søketype = visteData?.søketype ?? "ukjent";
  const resultater = visteData?.resultater;
  const side = visteData?.side ?? 1;
  const totalSider = visteData?.totalSider ?? 1;
  const totalAntall = visteData?.totalAntall ?? 0;
  const harSøkt = actionData !== undefined;
  const [sortering, setSortering] = useState<Sakssortering>(STANDARD_SAKSSORTERING);
  const sorterteResultater = resultater
    ? sorterSaker(resultater, sortering.kolonne, sortering.retning)
    : [];

  const resultatlisteRef = useRef<HTMLDivElement>(null);

  function fokuserHeaderSøkefelt() {
    document.querySelector<HTMLInputElement>(HURTIGSØK_INPUT_SELECTOR)?.focus();
  }

  function gåTilSide(nySide: number) {
    fetcher.submit(
      { søketekst, side: String(nySide) },
      { method: "post", action: RouteConfig.SØK },
    );
  }

  function handleResultatlisteKeyDown(event: React.KeyboardEvent) {
    const lenker = hentResultatlenker(resultatlisteRef.current);
    const aktivIndex = lenker.indexOf(event.target as HTMLAnchorElement);
    if (aktivIndex === -1) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (aktivIndex < lenker.length - 1) lenker[aktivIndex + 1].focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (aktivIndex > 0) {
        lenker[aktivIndex - 1].focus();
      } else {
        fokuserHeaderSøkefelt();
      }
    }
  }

  return (
    <>
      <MiljøtilpassetTittel>Søk – Watson Sak</MiljøtilpassetTittel>
      <VStack gap="space-12" className="mt-4 mb-8">
        <Heading level="1" size="large">
          Søk i saker
        </Heading>
        <Innsendingsfeil svar={visteData} tekster={INNSENDINGSFEIL.søk} />
        {harSøkt && (
          <VStack gap="space-4">
            {resultater && (
              <BodyShort>
                {totalAntall > 0
                  ? `${totalAntall} treff for "${søketekst}"`
                  : `Ingen treff for "${søketekst}"`}
              </BodyShort>
            )}

            {resultater && totalAntall > 0 && (
              <>
                <BodyShort size="small">Sorteringen gjelder treffene på denne siden.</BodyShort>
                <div
                  ref={resultatlisteRef}
                  onKeyDown={handleResultatlisteKeyDown}
                  data-søk-resultatliste
                  className="overflow-x-auto [&_table]:w-full"
                >
                  <Saksliste
                    {...SAKSLISTE_OPPSETT}
                    rader={sorterteResultater.map((sak) => mapKontrollsakTilSakslisteRad(sak))}
                    tomTekst="Ingen saker funnet."
                    tilbake={{ to: RouteConfig.SØK, label: "Søk" }}
                    sortering={{
                      kolonne: sortering.kolonne,
                      retning: sortering.retning === "asc" ? "stigende" : "synkende",
                      sorterbare: SORTERBARE_SAKSKOLONNER,
                      onSort: (kolonne) => {
                        if (!erSorterbarSakskolonne(kolonne)) return;
                        setSortering((forrige) => ({
                          kolonne,
                          retning:
                            forrige.kolonne === kolonne
                              ? forrige.retning === "asc"
                                ? "desc"
                                : "asc"
                              : standardRetningForKolonne(kolonne),
                        }));
                      },
                    }}
                  />
                </div>

                {totalSider > 1 && (
                  <HStack justify="center" className="mt-6">
                    <Pagination
                      page={side}
                      onPageChange={gåTilSide}
                      count={totalSider}
                      size="small"
                    />
                  </HStack>
                )}
              </>
            )}

            {resultater && totalAntall === 0 && (
              <>
                {søketype === "personIdent" ? (
                  <Box
                    background="info-soft"
                    borderRadius="8"
                    padding="space-24"
                    className="max-w-xl mt-4"
                  >
                    <VStack gap="space-16">
                      <VStack gap="space-4">
                        <Heading level="2" size="small">
                          Ser du etter en person?
                        </Heading>
                        <BodyShort>
                          {formaterFødselsnummer(søketekst)} ser ut som et{" "}
                          {erDnummer(søketekst) ? "d-nummer" : "fødselsnummer"}. Hvis du vil, kan du
                          opprette en sak, eller slå opp personen i Watson Søk.
                        </BodyShort>
                      </VStack>
                      <HStack gap="space-4">
                        {!erLesebruker && (
                          <forhåndsutfyllFetcher.Form
                            method="post"
                            action={RouteConfig.API.FORHÅNDSUTFYLL_REGISTRER_SAK}
                            onSubmit={() => sporHendelse("søk opprett sak klikket")}
                          >
                            <input type="hidden" name="fnr" value={søketekst} />
                            <Button type="submit" variant="secondary">
                              Opprett sak
                            </Button>
                          </forhåndsutfyllFetcher.Form>
                        )}
                        {watsonSokUrl && (
                          <form
                            method="post"
                            action={`${watsonSokUrl}/api/eksternt-søk`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onSubmit={() => sporHendelse("søk watson søk klikket")}
                          >
                            <input type="hidden" name="ident" value={søketekst} />
                            <Button type="submit" variant="secondary">
                              Slå opp i Watson Søk
                            </Button>
                          </form>
                        )}
                      </HStack>
                    </VStack>
                  </Box>
                ) : (
                  <IngenTreff {...tomTreffTekst(søketype, søketekst)} />
                )}
              </>
            )}
          </VStack>
        )}

        {!harSøkt && <SøkeVeiledning />}
      </VStack>
    </>
  );
}
