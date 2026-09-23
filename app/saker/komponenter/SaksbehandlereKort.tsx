import { PersonPencilIcon, PersonPlusIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, HStack, Label, VStack } from "@navikt/ds-react";
import { useState } from "react";
import { useFetcher } from "react-router";
import { useInnloggetBruker } from "~/auth/innlogget-bruker";
import { finnEnhetsnavn } from "~/kodeverk/enheter";
import { useKodeverk } from "~/kodeverk/useKodeverk";
import { Kort } from "~/komponenter/Kort";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import { getSaksenhet } from "~/saker/selectors";
import { hentStegbaserteSaksregler } from "~/saker/stegregler";
import type { KontrollsakResponse, KontrollsakSaksbehandler } from "~/saker/types.backend";
import { DelTilgangModal } from "~/saker/handlinger/DelTilgangModal";
import { OverforAnsvarligModal } from "~/saker/handlinger/OverforAnsvarligModal";
import { SendTilAnnenEnhetModal } from "~/saker/handlinger/SendTilAnnenEnhetModal";
import { TildelSaksbehandlerModal } from "~/saker/handlinger/TildelSaksbehandlerModal";

interface SaksbehandlereKortProps {
  sak: KontrollsakResponse;
  saksbehandlerDetaljer: KontrollsakSaksbehandler[];
  ansvarligSaksbehandler: KontrollsakSaksbehandler | null;
  erEier: boolean;
  kanTildeleSak?: boolean;
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
        <BodyShort weight="semibold">{saksbehandler.navn}</BodyShort>
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
}: SaksbehandlereKortProps) {
  const [visOverforModal, setVisOverforModal] = useState(false);
  const [visDelTilgangModal, setVisDelTilgangModal] = useState(false);
  const [visTildelModal, setVisTildelModal] = useState(false);
  const [visSendTilAnnenEnhetModal, setVisSendTilAnnenEnhetModal] = useState(false);
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
    tildelMegFetcher.submit(
      { handling: "TILDEL", navIdent: innloggetBruker.navIdent, navn: innloggetBruker.name },
      { method: "post", action: sakPath },
    );
  }

  function handleFjernSaksbehandler() {
    fjernSaksbehandlerFetcher.submit({ handling: "FRISTILL" }, { method: "post", action: sakPath });
  }

  // Kun sakens ansvarlige saksbehandler eller en leder kan fjerne ansvarlig saksbehandler.
  const kanFjerneSaksbehandler = kanEndreTilgang && (erEier || innloggetBruker.erLeder);

  return (
    <>
      <Kort padding="space-6">
        <VStack gap="space-4">
          <VStack gap="space-4">
            <Label as="h2" size="small">
              Enhet
            </Label>

            <HStack justify="space-between" align="center">
              <BodyShort>{enhetsnavn || "Ingen"}</BodyShort>

              {kanEndreTilgang && (
                <Button
                  type="button"
                  variant="tertiary"
                  size="xsmall"
                  onClick={() => setVisSendTilAnnenEnhetModal(true)}
                  aria-label="Endre enhet"
                >
                  Endre
                </Button>
              )}
            </HStack>
          </VStack>

          <hr className="my-4 border-ax-border-neutral-subtle" />

          <Label as="h2" size="small">
            Saksbehandler
          </Label>

          {ansvarligSaksbehandler ? (
            <>
              <SaksbehandlerRad
                saksbehandler={ansvarligSaksbehandler}
                handling={
                  kanEndreTilgang ? (
                    <Button
                      type="button"
                      variant="tertiary"
                      size="xsmall"
                      onClick={() => setVisOverforModal(true)}
                      aria-label="Endre ansvarlig saksbehandler"
                    >
                      Endre
                    </Button>
                  ) : null
                }
              />
              {kanFjerneSaksbehandler && (
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  onClick={handleFjernSaksbehandler}
                  loading={fjernSaksbehandlerFetcher.state !== "idle"}
                >
                  Fjern saksbehandler
                </Button>
              )}
            </>
          ) : (
            <>
              <BodyShort className="text-ax-text-neutral-subtle">
                Ingen ansvarlig saksbehandler satt.
              </BodyShort>
              {kanEndreTilgang && (
                <VStack gap="space-2">
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
            </>
          )}

          {sak.saksbehandlere.deltMed.length > 0 && (
            <>
              <hr className="my-4 border-ax-border-neutral-subtle" />
              <VStack gap="space-2">
                <Label as="h3" size="small">
                  Delt med
                </Label>
                {sak.saksbehandlere.deltMed.map((saksbehandler) => (
                  <SaksbehandlerRad
                    key={saksbehandler.navIdent}
                    saksbehandler={saksbehandler}
                    handling={
                      erEier && kanEndreDeltTilgang ? (
                        <Button
                          type="button"
                          variant="tertiary"
                          size="xsmall"
                          onClick={() => fjernDeltTilgang(saksbehandler.navIdent)}
                          aria-label={`Fjern deling med ${saksbehandler.navn}`}
                        >
                          Fjern
                        </Button>
                      ) : null
                    }
                  />
                ))}
              </VStack>
            </>
          )}

          {erEier && kanEndreDeltTilgang && ansvarligSaksbehandler && (
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={() => setVisDelTilgangModal(true)}
            >
              Del tilgang
            </Button>
          )}
        </VStack>
      </Kort>

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
    </>
  );
}
