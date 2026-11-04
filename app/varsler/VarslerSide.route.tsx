import { ArrowLeftIcon, BellIcon, InformationSquareIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Heading, HStack, InfoCard, VStack } from "@navikt/ds-react";
import { useEffect, useState } from "react";
import { Form, useActionData, useFetcher, useLoaderData, useNavigate } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { Innsendingsfeil } from "~/feilhåndtering/Innsendingsfeil";
import { INNSENDINGSFEIL } from "~/feilhåndtering/feilmeldinger";
import { MiljøtilpassetTittel } from "~/layout/MiljøtilpassetTittel";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import type { Varsel } from "./typer";
import { formaterVarselTidspunkt, varselDestinasjon } from "./typer";
import type { action } from "./VarslerSide.action.server";
import type { loader } from "./VarslerSide.loader.server";

export { action } from "./VarslerSide.action.server";
export { loader } from "./VarslerSide.loader.server";

export default function VarslerSide() {
  const actionData = useActionData<typeof action>();
  const loaderData = useLoaderData<typeof loader>();
  const lastFlereFetcher = useFetcher<typeof loader>();
  const [akkumulerteVarsler, setAkkumulerteVarsler] = useState<Varsel[]>(loaderData.varsler);
  const [nesteSide, setNesteSide] = useState(loaderData.page + 1);
  const [harFlere, setHarFlere] = useState(loaderData.harFlere);
  const [antall, setAntall] = useState({
    uleste: loaderData.antallUleste,
    leste: loaderData.antallLeste,
  });
  const navigate = useNavigate();
  const harForrigeSide = useHarForrigeSide();

  // Synkroniser state når loaderen revalideres (f.eks. etter «Marker alle som lest»)
  useEffect(() => {
    setAkkumulerteVarsler(loaderData.varsler);
    setNesteSide(loaderData.page + 1);
    setHarFlere(loaderData.harFlere);
    setAntall({ uleste: loaderData.antallUleste, leste: loaderData.antallLeste });
  }, [loaderData]);

  useEffect(() => {
    const data = lastFlereFetcher.data;
    if (data) {
      setAkkumulerteVarsler((prev) => [...prev, ...data.varsler]);
      setNesteSide(data.page + 1);
      setHarFlere(data.harFlere);
      setAntall({ uleste: data.antallUleste, leste: data.antallLeste });
    }
  }, [lastFlereFetcher.data]);

  const ulesteVarsler = akkumulerteVarsler.filter((v) => !v.erLest);
  const lesteVarsler = akkumulerteVarsler.filter((v) => v.erLest);

  return (
    <>
      <MiljøtilpassetTittel>Varsler – Watson Sak</MiljøtilpassetTittel>
      <VStack gap="space-24" className="mt-4 mb-8 max-w-[857px]">
        <HStack gap="space-16" align="center" justify="space-between">
          <HStack gap="space-8" align="center">
            <BellIcon aria-hidden fontSize="1.5rem" />
            <Heading level="1" size="large">
              Varsler
            </Heading>
          </HStack>

          <HStack gap="space-8" align="center">
            {harForrigeSide && (
              <Button
                type="button"
                variant="tertiary"
                size="small"
                icon={<ArrowLeftIcon aria-hidden />}
                onClick={() => navigate(-1)}
              >
                Gå tilbake
              </Button>
            )}
            {ulesteVarsler.length > 0 && (
              <Form
                method="post"
                replace
                onSubmit={() =>
                  sporHendelse("varsler markert som lest", { antall: ulesteVarsler.length })
                }
              >
                <input type="hidden" name="handling" value="marker_alle_som_lest" />
                {ulesteVarsler.map((v) => (
                  <input key={v.id} type="hidden" name="varselId" value={v.id} />
                ))}
                <Button type="submit" variant="secondary" size="small">
                  Marker alle som lest
                </Button>
              </Form>
            )}
          </HStack>
        </HStack>

        <Innsendingsfeil svar={actionData} tekster={INNSENDINGSFEIL.merkVarslerLest} />

        {akkumulerteVarsler.length === 0 ? (
          <BodyShort className="text-ax-text-neutral-subtle">Du har ingen varsler.</BodyShort>
        ) : (
          <VStack gap="space-24">
            <Varselgruppe tittel="Uleste" antall={antall.uleste} varsler={ulesteVarsler} />
            <Varselgruppe tittel="Leste" antall={antall.leste} varsler={lesteVarsler} />

            {harFlere && (
              <HStack justify="center">
                <Button
                  type="button"
                  variant="tertiary"
                  size="small"
                  loading={lastFlereFetcher.state !== "idle"}
                  onClick={() => {
                    lastFlereFetcher.load(`${RouteConfig.VARSLER}?page=${nesteSide}`);
                  }}
                >
                  Last flere
                </Button>
              </HStack>
            )}
          </VStack>
        )}
      </VStack>
    </>
  );
}

/**
 * Om det finnes en tidligere side i appen å gå tilbake til. React Router lagrer
 * posisjonen i historikken som `idx` i `history.state`. Den er 0 når siden åpnes
 * direkte (ny fane, bokmerke) og overlever omlasting. Leses først etter hydrering,
 * slik at serveren og første klientrendering gir samme markup.
 */
function useHarForrigeSide() {
  const [harForrigeSide, setHarForrigeSide] = useState(false);
  useEffect(() => {
    const idx = (window.history.state as { idx?: unknown } | null)?.idx;
    setHarForrigeSide(typeof idx === "number" && idx > 0);
  }, []);
  return harForrigeSide;
}

function Varselgruppe({
  tittel,
  antall,
  varsler,
}: {
  tittel: string;
  antall: number;
  varsler: Varsel[];
}) {
  if (varsler.length === 0) return null;
  return (
    <section aria-label={tittel}>
      <VStack gap="space-16">
        <Heading level="2" size="xsmall" className="text-ax-text-neutral-subtle font-normal">
          {tittel} ({antall})
        </Heading>
        {varsler.map((varsel) => (
          <Varselkort key={varsel.id} varsel={varsel} />
        ))}
      </VStack>
    </section>
  );
}

function Varselkort({ varsel }: { varsel: Varsel }) {
  const navigate = useNavigate();
  return (
    <InfoCard size="small" data-color={varsel.erLest ? "neutral" : "info"}>
      <InfoCard.Header icon={<InformationSquareIcon aria-hidden />}>
        <HStack gap="space-8" align="center" justify="space-between">
          <InfoCard.Title as="h3">{varsel.tittel}</InfoCard.Title>
          <BodyShort size="small" className="text-ax-text-neutral-subtle ml-auto">
            <time dateTime={varsel.tidspunkt}>{formaterVarselTidspunkt(varsel.tidspunkt)}</time>
          </BodyShort>
        </HStack>
      </InfoCard.Header>
      <InfoCard.Content>
        <HStack gap="space-16" align="end" justify="space-between">
          <BodyShort size="small" className="min-w-0 flex-[1_1_16rem]">
            {varsel.tekst}
          </BodyShort>
          <Button
            size="small"
            variant="secondary"
            className="ml-auto"
            onClick={() => {
              const sakReferanse = getSaksreferanse(varsel.sakId);
              const destinasjon = varselDestinasjon(varsel, sakReferanse);
              sporHendelse("navigere", {
                kilde: "varsler-side",
                destinasjon: varsel.dokumentId ? "dokument-kommentarer" : "sak",
              });
              if (!varsel.erLest) {
                // Fire-and-forget med keepalive slik at requesten overlever navigasjon
                const fd = new FormData();
                fd.set("varselId", varsel.id);
                fetch(RouteConfig.API.MARKER_VARSEL_LEST, {
                  method: "POST",
                  body: fd,
                  keepalive: true,
                });
              }
              navigate(destinasjon, {
                state: { tilbake: { to: RouteConfig.VARSLER, label: "Varsler" } },
              });
            }}
          >
            {varsel.dokumentId ? "Åpne kommentaren" : "Gå til sak"}
          </Button>
        </HStack>
      </InfoCard.Content>
    </InfoCard>
  );
}
