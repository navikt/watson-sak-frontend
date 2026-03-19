import { MagnifyingGlassIcon } from "@navikt/aksel-icons";
import { BodyShort, Heading, Page, Search, VStack } from "@navikt/ds-react";
import { PageBlock } from "@navikt/ds-react/Page";
import { Form, useActionData } from "react-router";
import type { Sak } from "~/saker/typer";
import { SøkResultatKort } from "./SøkResultatKort";
import { søkSaker } from "./søk.server";
import type { Route } from "./+types/SøkSide.route";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const søketekst = (formData.get("søketekst") as string) ?? "";

  if (!søketekst.trim()) {
    return { søketekst: "", resultater: [] as Sak[] };
  }

  const resultater = søkSaker(søketekst);
  return { søketekst, resultater };
}

export default function SøkSide() {
  const actionData = useActionData<typeof action>();
  const søketekst = actionData?.søketekst ?? "";
  const resultater = actionData?.resultater;
  const harSøkt = actionData !== undefined;

  return (
    <Page>
      <title>Søk – Watson Sak</title>
      <PageBlock width="lg" gutters>
        <VStack gap="space-8" className="py-6">
          <VStack gap="space-4">
            <Heading level="1" size="large">
              Søk i saker
            </Heading>
            <Form method="post" role="search" className="max-w-xl">
              <Search
                label="Søk etter saker"
                name="søketekst"
                defaultValue={søketekst}
                variant="primary"
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
                <VStack gap="space-4">
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
                    Prøv å søke på saksnummer, fødselsnummer, tags eller kategorier.
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
                Søk etter saker på saksnummer, fødselsnummer, tags eller kategorier.
              </BodyShort>
            </VStack>
          )}
        </VStack>
      </PageBlock>
    </Page>
  );
}
