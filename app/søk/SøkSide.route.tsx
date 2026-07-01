import { MagnifyingGlassIcon } from "@navikt/aksel-icons";
import { BodyShort, Box, Button, Heading, HStack, Search, VStack } from "@navikt/ds-react";
import { useEffect, useRef } from "react";
import { Form, unstable_useRoute, useActionData, useNavigate } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { RouteConfig } from "~/routeConfig";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { erFnr, formaterFødselsnummer } from "~/utils/string-utils";
import { hentValgfriTekst } from "~/utils/form-data";
import { SøkResultatKort } from "./SøkResultatKort";
import { søkSaker } from "./søk.server";
import type { Route } from "./+types/SøkSide.route";

type Søksak = KontrollsakResponse;

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const søketekst = hentValgfriTekst(formData, "søketekst") ?? "";

  if (!søketekst.trim()) {
    return { søketekst: "", resultater: [] as Søksak[] };
  }

  const resultater = await søkSaker(request, søketekst);
  return { søketekst, resultater };
}

function hentResultatlenker(container: HTMLElement | null): HTMLAnchorElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLAnchorElement>("a"));
}

export default function SøkSide() {
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const { loaderData } = unstable_useRoute("root");
  const watsonSokUrl = loaderData?.envs.watsonSokUrl ?? null;

  const søketekst = actionData?.søketekst ?? "";
  const resultater = actionData?.resultater;
  const harSøkt = actionData !== undefined;
  const erFnrSøk = erFnr(søketekst);

  function håndterOpprettSak() {
    sporHendelse("søk opprett sak klikket", { kilde: "ingen-treff" });
    navigate(`${RouteConfig.REGISTRER_SAK}?fnr=${søketekst}`);
  }

  const skjemaRef = useRef<HTMLFormElement>(null);
  const resultatlisteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && event.metaKey) {
        event.preventDefault();
        event.stopImmediatePropagation();
        skjemaRef.current?.querySelector("input")?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  function handleSøkefeltKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const lenker = hentResultatlenker(resultatlisteRef.current);
      if (lenker.length > 0) lenker[0].focus();
    }
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
        skjemaRef.current?.querySelector("input")?.focus();
      }
    }
  }

  return (
    <>
      <title>Søk – Watson Sak</title>
      <VStack gap="space-12" className="mt-4 mb-8">
        <Heading level="1" size="large">
          Søk i saker
        </Heading>
        <VStack gap="space-4">
          <Form
            method="post"
            role="search"
            aria-label="Søk i saker"
            className="max-w-xl"
            ref={skjemaRef}
            onSubmit={() => sporHendelse("søk utført", { kilde: "søkeside" })}
          >
            <Search
              label="Søk etter saker"
              name="søketekst"
              defaultValue={søketekst}
              variant="primary"
              autoFocus
              onKeyDown={handleSøkefeltKeyDown}
            />
          </Form>
        </VStack>

        {harSøkt && (
          <VStack gap="space-4">
            <BodyShort>
              {resultater && resultater.length > 0
                ? `${resultater.length} treff for "${søketekst}"`
                : `Ingen treff for "${søketekst}"`}
            </BodyShort>

            {resultater && resultater.length > 0 && (
              <VStack gap="space-8" ref={resultatlisteRef} onKeyDown={handleResultatlisteKeyDown}>
                {resultater.map((sak) => (
                  <SøkResultatKort key={sak.id} sak={sak} />
                ))}
              </VStack>
            )}

            {resultater && resultater.length === 0 && (
              <>
                {erFnrSøk ? (
                  <Box
                    background="info-soft"
                    borderRadius="8"
                    padding="space-16"
                    className="max-w-xl"
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
                        <Button variant="secondary" onClick={håndterOpprettSak}>
                          Opprett sak
                        </Button>
                        {watsonSokUrl && (
                          <Button
                            variant="secondary"
                            as="a"
                            href={watsonSokUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => sporHendelse("søk watson søk klikket")}
                          >
                            Slå opp i Watson Søk
                          </Button>
                        )}
                      </HStack>
                    </VStack>
                  </Box>
                ) : (
                  <VStack gap="space-4" align="center" className="py-12">
                    <MagnifyingGlassIcon
                      aria-hidden
                      fontSize="3rem"
                      className="text-ax-icon-neutral-subtle"
                    />
                    <BodyShort className="text-ax-text-neutral-subtle">
                      Prøv å søke på saksnummer, fødselsnummer eller kategorier.
                    </BodyShort>
                  </VStack>
                )}
              </>
            )}
          </VStack>
        )}

        {!harSøkt && (
          <VStack gap="space-4" align="center" className="py-12">
            <MagnifyingGlassIcon
              aria-hidden
              fontSize="3rem"
              className="text-ax-icon-neutral-subtle"
            />
            <BodyShort className="text-ax-text-neutral-subtle">
              Søk etter saker på saksnummer, fødselsnummer eller kategorier.
            </BodyShort>
          </VStack>
        )}
      </VStack>
    </>
  );
}
