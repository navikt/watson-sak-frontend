import { TrashIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, HStack, Label, VStack } from "@navikt/ds-react";
import { useState } from "react";
import { useFetcher } from "react-router";
import { Kort } from "~/komponenter/Kort";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import type { KontrollsakResponse, KontrollsakSaksbehandler } from "~/saker/types.backend";
import { erAktivSakKontrollsak } from "~/saker/handlinger/tilgjengeligeHandlinger";
import { OverforAnsvarligModal } from "~/saker/handlinger/OverforAnsvarligModal";

interface SaksbehandlereKortProps {
  sak: KontrollsakResponse;
  saksbehandlerDetaljer: KontrollsakSaksbehandler[];
  ansvarligSaksbehandler: KontrollsakSaksbehandler | null;
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
}: SaksbehandlereKortProps) {
  const [visOverforModal, setVisOverforModal] = useState(false);
  const fetcher = useFetcher();
  const erAktiv = erAktivSakKontrollsak(sak.status);
  const ansvarligSaksbehandler = ansvarligFraProps ?? sak.saksbehandlere.eier;

  function fjernDeltTilgang(navIdent: string) {
    fetcher.submit(
      { handling: "fjern_delt_tilgang", navIdent },
      {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sak.id)),
      },
    );
  }

  return (
    <>
      <Kort padding="space-6">
        <VStack gap="space-4">
          <Label as="h2" size="small">
            Saksbehandlere
          </Label>

          {ansvarligSaksbehandler ? (
            <SaksbehandlerRad
              saksbehandler={ansvarligSaksbehandler}
              handling={
                erAktiv ? (
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
          ) : (
            <BodyShort className="text-ax-text-neutral-subtle">
              Ingen ansvarlig saksbehandler satt.
            </BodyShort>
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
                      erAktiv ? (
                        <Button
                          type="button"
                          variant="tertiary"
                          size="xsmall"
                          icon={<TrashIcon aria-hidden />}
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
        </VStack>
      </Kort>

      <OverforAnsvarligModal
        sakId={sak.id}
        saksbehandlerDetaljer={saksbehandlerDetaljer}
        åpen={visOverforModal}
        onClose={() => setVisOverforModal(false)}
      />
    </>
  );
}
