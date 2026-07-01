import { FileXMarkIcon, MagnifyingGlassIcon } from "@navikt/aksel-icons";
import { BodyShort, Box, Button, Heading, HStack, Tag, VStack } from "@navikt/ds-react";
import { useRef } from "react";
import { Form, Link, unstable_useRoute, useActionData } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { RouteConfig } from "~/routeConfig";
import { mapKontrollsakTilSakslisteRad } from "~/saker/saksliste/adaptere";
import { Saksliste } from "~/saker/saksliste/Saksliste";
import { formaterFødselsnummer, formaterOrganisasjonsnummer } from "~/utils/string-utils";
import { hentValgfriTekst } from "~/utils/form-data";
import { SøkSakOppsummering } from "./SøkSakOppsummering";
import { søkSaker, type SøkeType } from "./søk.server";
import { HURTIGSØK_INPUT_SELECTOR } from "./sok-navigasjon";
import type { Route } from "./+types/SøkSide.route";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const søketekst = hentValgfriTekst(formData, "søketekst") ?? "";

  if (!søketekst.trim()) {
    return { søketekst: "", søketype: "ukjent" as SøkeType, resultater: [] };
  }

  return søkSaker(request, søketekst);
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
  tittel: string;
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
          <Heading level="2" size="small" align="center">
            {tittel}
          </Heading>
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
      beskrivelse="Bruk søkefeltet i toppmenyen for å søke etter saksnummer, fødselsnummer eller organisasjonsnummer."
    >
      <HStack gap="space-8" justify="center" wrap>
        <Tag variant="neutral" size="small">
          Saksnummer
        </Tag>
        <Tag variant="neutral" size="small">
          Fødselsnummer
        </Tag>
        <Tag variant="neutral" size="small">
          Organisasjonsnummer
        </Tag>
      </HStack>
    </TomStatusboks>
  );
}

function IngenTreff({
  tittel,
  beskrivelse,
}: {
  tittel: string;
  beskrivelse: string;
}) {
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

function tomTreffTekst(søketype: SøkeType, søketekst: string): { tittel: string; beskrivelse: string } {
  switch (søketype) {
    case "saksnummer":
      return {
        tittel: `Fant ingen sak med saksnummer «${søketekst}»`,
        beskrivelse: "Sjekk at saksnummeret er riktig, eller søk på fødselsnummer eller organisasjonsnummer.",
      };
    case "organisasjonsnummer":
      return {
        tittel: `Ingen treff for organisasjonsnummer «${formaterOrganisasjonsnummer(søketekst)}»`,
        beskrivelse: "Fant ingen kontrollsaker knyttet til dette organisasjonsnummeret.",
      };
    case "personIdent":
      return {
        tittel: `Ingen treff for «${søketekst}»`,
        beskrivelse: "Fant ingen kontrollsaker for dette fødselsnummeret.",
      };
    default:
      return {
        tittel: "Ugyldig søk",
        beskrivelse:
          "Søket må være et fødselsnummer (11 sifre), organisasjonsnummer (9 sifre) eller saksnummer.",
      };
  }
}

export default function SøkSide() {
  const actionData = useActionData<typeof action>();
  const { loaderData } = unstable_useRoute("root");
  const watsonSokUrl = loaderData?.envs.watsonSokUrl ?? null;

  const søketekst = actionData?.søketekst ?? "";
  const søketype = actionData?.søketype ?? "ukjent";
  const resultater = actionData?.resultater;
  const harSøkt = actionData !== undefined;

  const resultatlisteRef = useRef<HTMLDivElement>(null);

  function fokuserHeaderSøkefelt() {
    document.querySelector<HTMLInputElement>(HURTIGSØK_INPUT_SELECTOR)?.focus();
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

  const antallTreff = resultater?.length ?? 0;

  return (
    <>
      <title>Søk – Watson Sak</title>
      <VStack gap="space-12" className="mt-4 mb-8">
        <Heading level="1" size="large">
          Søk i saker
        </Heading>
        {harSøkt && (
          <VStack gap="space-4">
            {resultater && (
              <BodyShort>
                {antallTreff > 0
                  ? `${antallTreff} treff for "${søketekst}"`
                  : `Ingen treff for "${søketekst}"`}
              </BodyShort>
            )}

            {resultater && antallTreff > 0 && søketype === "saksnummer" && (
              <div ref={resultatlisteRef} onKeyDown={handleResultatlisteKeyDown} data-søk-resultatliste>
                <SøkSakOppsummering sak={resultater[0]} />
              </div>
            )}

            {resultater && antallTreff > 0 && søketype !== "saksnummer" && (
              <div
                ref={resultatlisteRef}
                onKeyDown={handleResultatlisteKeyDown}
                data-søk-resultatliste
                className="overflow-x-auto [&_table]:w-full"
              >
                <Saksliste
                  rader={resultater.map((sak) => mapKontrollsakTilSakslisteRad(sak))}
                  kolonner={["saksid", "navn", "kategori", "misbrukstype", "status", "opprettet"]}
                  tomTekst="Ingen saker funnet."
                  tilbake={{ to: RouteConfig.SØK, label: "Søk" }}
                />
              </div>
            )}

            {resultater && antallTreff === 0 && (
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
                          {formaterFødselsnummer(søketekst)} ser ut som et fødselsnummer. Hvis du
                          vil, kan du opprette en sak, eller slå opp personen i Watson Søk.
                        </BodyShort>
                      </VStack>
                      <HStack gap="space-4">
                        <Form
                          method="post"
                          action={RouteConfig.API.FORHÅNDSUTFYLL_REGISTRER_SAK}
                          onSubmit={() => sporHendelse("søk opprett sak klikket")}
                        >
                          <input type="hidden" name="fnr" value={søketekst} />
                          <Button type="submit" variant="secondary">
                            Opprett sak
                          </Button>
                        </Form>
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
