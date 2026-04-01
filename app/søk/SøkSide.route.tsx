import { MagnifyingGlassIcon } from "@navikt/aksel-icons";
import { BodyShort, Heading, Page, Search, VStack } from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { useEffect, useRef } from "react";
import { Form, useActionData } from "react-router";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { SøkResultatKort } from "./SøkResultatKort";
import { søkSaker } from "./søk.server";
import type { Route } from "./+types/SøkSide.route";

type Søksak = KontrollsakResponse;

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const søketekst = (formData.get("søketekst") as string) ?? "";

  if (!søketekst.trim()) {
    return { søketekst: "", resultater: [] as Søksak[] };
  }

  const resultater = søkSaker(søketekst);
  return { søketekst, resultater };
}

function hentResultatlenker(container: HTMLElement | null): HTMLAnchorElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLAnchorElement>("a"));
}

export default function SøkSide() {
  const actionData = useActionData<typeof action>();
  const søketekst = actionData?.søketekst ?? "";
  const resultater = actionData?.resultater;
  const harSøkt = actionData !== undefined;

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
    <Page>
      <title>Søk – Watson Sak</title>
      <PageBlock width="lg" gutters>
        <VStack gap="space-8" className="py-6">
          <VStack gap="space-4">
            <Heading level="1" size="large">
              Søk i saker
            </Heading>
            <Form
              method="post"
              role="search"
              aria-label="Søk i saker"
              className="max-w-xl"
              ref={skjemaRef}
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
      </PageBlock>
    </Page>
  );
}
