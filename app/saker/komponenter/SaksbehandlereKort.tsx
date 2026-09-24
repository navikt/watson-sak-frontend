import { PersonPencilIcon, PersonPlusIcon, XMarkIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Detail, Heading, HStack, Tag, Tooltip, VStack } from "@navikt/ds-react";
import { useState } from "react";
import { useFetcher } from "react-router";
import { useInnloggetBruker } from "~/auth/innlogget-bruker";
import { finnEnhetsnavn } from "~/kodeverk/enheter";
import { useKodeverk } from "~/kodeverk/useKodeverk";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import { getSaksenhet } from "~/saker/selectors";
import { hentStegbaserteSaksregler } from "~/saker/stegregler";
import type {
  KontrollsakResponse,
  KontrollsakSaksbehandler,
  TillatteHandlingerResponse,
} from "~/saker/types.backend";
import { DelTilgangModal } from "~/saker/handlinger/DelTilgangModal";
import { EndreStatusModal } from "~/saker/handlinger/EndreStatusModal";
import { hentVisbareSteg } from "~/saker/handlinger/tillatte-steg";
import { OverforAnsvarligModal } from "~/saker/handlinger/OverforAnsvarligModal";
import { SendTilAnnenEnhetModal } from "~/saker/handlinger/SendTilAnnenEnhetModal";
import { TildelSaksbehandlerModal } from "~/saker/handlinger/TildelSaksbehandlerModal";
import { formaterStatus, formaterSteg, hentStegVariant } from "~/saker/visning";
import { ResponsivEndreKnapp } from "./ResponsivEndreKnapp";
import { Box } from "platejs/react";

interface SaksbehandlereKortProps {
  sak: KontrollsakResponse;
  saksbehandlerDetaljer: KontrollsakSaksbehandler[];
  ansvarligSaksbehandler: KontrollsakSaksbehandler | null;
  erEier: boolean;
  kanTildeleSak?: boolean;
  tillatteHandlinger?: TillatteHandlingerResponse;
}

function hentInitialer(navn: string) {
  return navn
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((del) => del[0]?.toUpperCase() ?? "")
    .join("");
}

function SaksbehandlerRad({
  saksbehandler,
  handling,
}: {
  saksbehandler: KontrollsakSaksbehandler;
  handling?: React.ReactNode;
}) {
  return (
    <HStack justify="space-between" align="center" gap="space-4">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ax-bg-accent-moderate font-semibold text-ax-text-accent">
          {hentInitialer(saksbehandler.navn)}
        </div>
        <BodyShort weight="semibold" size="small">
          {saksbehandler.navn}
        </BodyShort>
      </div>
      {handling}
    </HStack>
  );
}

export function SaksbehandlereKort({
  sak,
  saksbehandlerDetaljer,
  ansvarligSaksbehandler: ansvarligFraProps,
  erEier,
  kanTildeleSak = true,
  tillatteHandlinger,
}: SaksbehandlereKortProps) {
  const [visOverforModal, setVisOverforModal] = useState(false);
  const [visDelTilgangModal, setVisDelTilgangModal] = useState(false);
  const [visTildelModal, setVisTildelModal] = useState(false);
  const [visSendTilAnnenEnhetModal, setVisSendTilAnnenEnhetModal] = useState(false);
  const [åpenTilstandshandling, setÅpenTilstandshandling] = useState<
    "FLYTT_TIL_NESTE_STEG" | "ENDRE_STATUS" | null
  >(null);
  const innloggetBruker = useInnloggetBruker();
  const kodeverk = useKodeverk();
  const fetcher = useFetcher();
  const tildelMegFetcher = useFetcher();
  const fjernSaksbehandlerFetcher = useFetcher();
  const stegregler = hentStegbaserteSaksregler(sak.steg);
  const erAktivStatus = sak.status === null || sak.status === "AKTIV";
  const kanEndreTilgang = stegregler.erAktiv && erAktivStatus;
  const kanEndreDeltTilgang = stegregler.kanEndreDeltTilgang && erAktivStatus;
  const ansvarligSaksbehandler = ansvarligFraProps ?? sak.saksbehandlere.eier;
  const sakPath = RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sak.id));
  const enhetskode = getSaksenhet(sak);
  const enhetsnavn = finnEnhetsnavn(kodeverk.enheter, enhetskode);

  function fjernDeltTilgang(navIdent: string) {
    fetcher.submit(
      { handling: "fjern_delt_tilgang", navIdent },
      { method: "post", action: sakPath },
    );
  }

  function handleTildelMeg() {
    tildelMegFetcher.submit({ handling: "TILDEL_MEG" }, { method: "post", action: sakPath });
  }

  function handleFjernSaksbehandler() {
    fjernSaksbehandlerFetcher.submit({ handling: "FRISTILL" }, { method: "post", action: sakPath });
  }

  // Kun sakens ansvarlige saksbehandler eller en leder kan fjerne ansvarlig saksbehandler.
  const kanFjerneSaksbehandler = kanEndreTilgang && (erEier || innloggetBruker.erLeder);
  const kanEndreStatus =
    erEier && tillatteHandlinger?.handlinger.some((handling) => handling.type === "ENDRE_STATUS");
  const kanEndreSteg =
    erEier &&
    tillatteHandlinger?.handlinger.some((handling) => handling.type === "FLYTT_TIL_NESTE_STEG") &&
    hentVisbareSteg(tillatteHandlinger).length > 0;

  return (
    <>
      <VStack gap="space-20">
        <VStack gap="space-16" className="rounded-lg bg-ax-bg-neutral-soft p-4">
          <Heading level="2" size="small">
            Steg og status
          </Heading>

          <VStack gap="space-2">
            <Detail className="text-ax-text-neutral-subtle" uppercase>
              Steg
            </Detail>
            <HStack justify="space-between" align="center" gap="space-4">
              <div>
                <Tag variant="moderate" data-color={hentStegVariant(sak.steg)} size="medium">
                  {formaterSteg(sak.steg)}
                </Tag>
              </div>
              {kanEndreSteg && (
                <ResponsivEndreKnapp
                  ariaLabel="Endre steg"
                  onClick={() => setÅpenTilstandshandling("FLYTT_TIL_NESTE_STEG")}
                />
              )}
            </HStack>
          </VStack>

          <hr className="border-ax-border-neutral-subtle" />

          <VStack gap="space-2" className="mb-2">
            <Detail className="text-ax-text-neutral-subtle" uppercase>
              Status
            </Detail>
            <HStack justify="space-between" align="center" gap="space-4">
              <div>
                <Tag
                  variant="moderate"
                  data-color={!sak.status || sak.status === "AKTIV" ? "success" : "warning"}
                  size="medium"
                >
                  {sak.status ? formaterStatus(sak.status) : "Aktiv"}
                </Tag>
              </div>
              {kanEndreStatus && (
                <ResponsivEndreKnapp
                  ariaLabel="Endre status"
                  onClick={() => setÅpenTilstandshandling("ENDRE_STATUS")}
                />
              )}
            </HStack>
          </VStack>
        </VStack>

        <VStack gap="space-12" className="rounded-lg bg-ax-bg-neutral-soft p-4">
          <Heading level="2" size="small">
            Tilhørighet
          </Heading>

          <VStack gap="space-2">
            <Detail className="text-ax-text-neutral-subtle" uppercase>
              Enhet
            </Detail>

            <HStack justify="space-between" align="center">
              <BodyShort weight="semibold" size="small">
                {enhetsnavn || "Ingen"}
              </BodyShort>

              {kanEndreTilgang && (
                <ResponsivEndreKnapp
                  ariaLabel="Endre enhet"
                  onClick={() => setVisSendTilAnnenEnhetModal(true)}
                />
              )}
            </HStack>
          </VStack>

          <hr className="border-ax-border-neutral-subtle" />

          <VStack gap="space-2">
            <Detail className="text-ax-text-neutral-subtle" uppercase>
              Saksbehandler
            </Detail>

            {ansvarligSaksbehandler ? (
              <SaksbehandlerRad
                saksbehandler={ansvarligSaksbehandler}
                handling={
                  kanEndreTilgang ? (
                    <HStack gap="space-2" align="center">
                      <ResponsivEndreKnapp
                        ariaLabel="Endre ansvarlig saksbehandler"
                        onClick={() => setVisOverforModal(true)}
                      />
                      {kanFjerneSaksbehandler && (
                        <Tooltip content="Fjern saksbehandler">
                          <Button
                            type="button"
                            variant="tertiary"
                            size="xsmall"
                            icon={<XMarkIcon aria-hidden />}
                            aria-label="Fjern saksbehandler"
                            onClick={handleFjernSaksbehandler}
                            loading={fjernSaksbehandlerFetcher.state !== "idle"}
                          >
                            <span className="hidden xl:inline">Fjern</span>
                          </Button>
                        </Tooltip>
                      )}
                    </HStack>
                  ) : null
                }
              />
            ) : (
              <BodyShort className="text-ax-text-neutral-subtle mb-2">
                Ingen ansvarlig saksbehandler satt.
              </BodyShort>
            )}

            {kanEndreTilgang && !ansvarligSaksbehandler && (
              <VStack gap="space-8">
                {kanTildeleSak ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    icon={<PersonPlusIcon aria-hidden />}
                    onClick={handleTildelMeg}
                    loading={tildelMegFetcher.state !== "idle"}
                  >
                    Tildel meg
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  icon={<PersonPencilIcon aria-hidden />}
                  onClick={() => setVisTildelModal(true)}
                >
                  Tildel saksbehandler
                </Button>
              </VStack>
            )}
          </VStack>

          <hr className="border-ax-border-neutral-subtle" />

          <VStack gap="space-2" className="mb-2">
            <Detail className="text-ax-text-neutral-subtle" uppercase>
              Delt tilgang
            </Detail>
            {sak.saksbehandlere.deltMed.length > 0 ? (
              sak.saksbehandlere.deltMed.map((saksbehandler) => (
                <SaksbehandlerRad
                  key={saksbehandler.navIdent}
                  saksbehandler={saksbehandler}
                  handling={
                    erEier && kanEndreDeltTilgang ? (
                      <Button
                        type="button"
                        variant="tertiary"
                        size="xsmall"
                        icon={<XMarkIcon aria-hidden />}
                        onClick={() => fjernDeltTilgang(saksbehandler.navIdent)}
                        aria-label={`Fjern deling med ${saksbehandler.navn}`}
                      >
                        Fjern
                      </Button>
                    ) : null
                  }
                />
              ))
            ) : (
              <HStack justify="space-between" align="center">
                <BodyShort textColor="subtle">Ingen</BodyShort>
                {erEier && kanEndreDeltTilgang && ansvarligSaksbehandler && (
                  <Tooltip content="Legg til delt tilgang">
                    <Button
                      type="button"
                      variant="tertiary"
                      size="xsmall"
                      icon={<PersonPlusIcon aria-hidden />}
                      aria-label="Legg til delt tilgang"
                      onClick={() => setVisDelTilgangModal(true)}
                    >
                      <span className="hidden xl:inline">Legg til</span>
                    </Button>
                  </Tooltip>
                )}
              </HStack>
            )}
          </VStack>

          {erEier &&
            kanEndreDeltTilgang &&
            ansvarligSaksbehandler &&
            sak.saksbehandlere.deltMed.length > 0 && (
              <Box className="flex justify-start">
                <Tooltip content="Legg til delt tilgang">
                  <Button
                    type="button"
                    variant="tertiary"
                    size="xsmall"
                    icon={<PersonPlusIcon aria-hidden />}
                    aria-label="Legg til delt tilgang"
                    onClick={() => setVisDelTilgangModal(true)}
                  >
                    <span className="hidden xl:inline">Legg til</span>
                  </Button>
                </Tooltip>
              </Box>
            )}
        </VStack>
      </VStack>

      <DelTilgangModal
        sakId={String(sak.id)}
        saksbehandlerDetaljer={saksbehandlerDetaljer}
        åpen={visDelTilgangModal}
        onClose={() => setVisDelTilgangModal(false)}
      />
      <OverforAnsvarligModal
        sakId={String(sak.id)}
        saksbehandlerDetaljer={saksbehandlerDetaljer}
        åpen={visOverforModal}
        onClose={() => setVisOverforModal(false)}
      />
      <TildelSaksbehandlerModal
        sakId={String(sak.id)}
        saksbehandlere={[]}
        saksbehandlerDetaljer={saksbehandlerDetaljer}
        åpen={visTildelModal}
        onClose={() => setVisTildelModal(false)}
      />
      <SendTilAnnenEnhetModal
        sakId={String(sak.id)}
        nåværendeEnhet={getSaksenhet(sak)}
        ansvarligSaksbehandler={ansvarligSaksbehandler}
        innloggetNavIdent={innloggetBruker.navIdent}
        åpen={visSendTilAnnenEnhetModal}
        onClose={() => setVisSendTilAnnenEnhetModal(false)}
      />
      {tillatteHandlinger && (
        <EndreStatusModal
          sakId={String(sak.id)}
          tillatteHandlinger={tillatteHandlinger}
          handling={åpenTilstandshandling}
          onClose={() => setÅpenTilstandshandling(null)}
        />
      )}
    </>
  );
}
