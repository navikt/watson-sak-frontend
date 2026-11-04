import { ArrowLeftIcon, BellIcon, InformationSquareIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Heading, HStack, InfoCard, Pagination, VStack } from "@navikt/ds-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  Form,
  useActionData,
  useFetcher,
  useLoaderData,
  useNavigate,
  useSearchParams,
} from "react-router";
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
  const { uleste, leste } = useLoaderData<typeof loader>();
  const flereUlesteFetcher = useFetcher<typeof loader>();
  const [, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const harForrigeSide = useHarForrigeSide();

  // Uleste lastes med «Last flere» og samles opp her. Listen nullstilles bare når
  // første side faktisk endrer seg (f.eks. etter «Marker alle som lest»), ikke når
  // brukeren blar i leste varsler og loaderen kjører på nytt.
  const [ulesteState, setUlesteState] = useState({
    varsler: uleste.varsler,
    nesteSide: uleste.side + 1,
    harFlere: uleste.harFlere,
  });
  const førsteSideNøkkel = uleste.varsler.map((v) => v.id).join(",");
  const forrigeFørsteSideNøkkel = useRef(førsteSideNøkkel);
  useEffect(() => {
    if (forrigeFørsteSideNøkkel.current === førsteSideNøkkel) return;
    forrigeFørsteSideNøkkel.current = førsteSideNøkkel;
    setUlesteState({
      varsler: uleste.varsler,
      nesteSide: uleste.side + 1,
      harFlere: uleste.harFlere,
    });
  }, [førsteSideNøkkel, uleste]);

  useEffect(() => {
    const data = flereUlesteFetcher.data;
    if (!data) return;
    setUlesteState((forrige) => {
      const kjente = new Set(forrige.varsler.map((v) => v.id));
      return {
        varsler: [...forrige.varsler, ...data.uleste.varsler.filter((v) => !kjente.has(v.id))],
        nesteSide: data.uleste.side + 1,
        harFlere: data.uleste.harFlere,
      };
    });
  }, [flereUlesteFetcher.data]);

  function gåTilSide(side: number) {
    setSearchParams(
      (forrige) => {
        const neste = new URLSearchParams(forrige);
        neste.set("side", String(side));
        return neste;
      },
      { preventScrollReset: true },
    );
  }

  const ulesteVarsler = ulesteState.varsler;
  const harIngenVarsler = uleste.totalItems === 0 && leste.totalItems === 0;

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

        {harIngenVarsler ? (
          <BodyShort className="text-ax-text-neutral-subtle">Du har ingen varsler.</BodyShort>
        ) : (
          <VStack gap="space-24">
            {ulesteVarsler.length > 0 && (
              <Varselgruppe tittel="Uleste" antall={uleste.totalItems} varsler={ulesteVarsler}>
                {ulesteState.harFlere && (
                  <HStack justify="center">
                    <Button
                      type="button"
                      variant="tertiary"
                      size="small"
                      loading={flereUlesteFetcher.state !== "idle"}
                      onClick={() => {
                        const params = new URLSearchParams({
                          ulesteSide: String(ulesteState.nesteSide),
                          side: String(leste.side),
                        });
                        flereUlesteFetcher.load(`${RouteConfig.VARSLER}?${params}`);
                      }}
                    >
                      Last flere uleste
                    </Button>
                  </HStack>
                )}
              </Varselgruppe>
            )}

            {leste.totalItems > 0 && (
              <Varselgruppe tittel="Leste" antall={leste.totalItems} varsler={leste.varsler}>
                {leste.totalSider > 1 && (
                  <HStack justify="center">
                    <Pagination
                      page={leste.side}
                      onPageChange={gåTilSide}
                      count={leste.totalSider}
                      size="small"
                    />
                  </HStack>
                )}
              </Varselgruppe>
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
  children,
}: {
  tittel: string;
  antall: number;
  varsler: Varsel[];
  children?: ReactNode;
}) {
  return (
    <section aria-label={tittel}>
      <VStack gap="space-16">
        <Heading level="2" size="xsmall" className="text-ax-text-neutral-subtle font-normal">
          {tittel} ({antall})
        </Heading>
        {varsler.map((varsel) => (
          <Varselkort key={varsel.id} varsel={varsel} />
        ))}
        {children}
      </VStack>
    </section>
  );
}

function Varselkort({ varsel }: { varsel: Varsel }) {
  const navigate = useNavigate();
  return (
    <InfoCard size="small" data-color={varsel.erLest ? "neutral" : "info"}>
      <InfoCard.Header icon={<InformationSquareIcon aria-hidden />}>
        <HStack
          gap="space-8"
          align="center"
          justify="space-between"
          wrap={false}
          className="w-full flex-1"
        >
          <InfoCard.Title as="h3" className="min-w-0">
            {getSaksreferanse(varsel.sakId)}: {varsel.tittel}
          </InfoCard.Title>
          <BodyShort
            size="small"
            className="text-ax-text-neutral-subtle ml-auto shrink-0 whitespace-nowrap"
          >
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
