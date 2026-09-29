import { useEffect, useReducer, useRef } from "react";
import { BodyShort, Button, ErrorMessage, Modal, VStack } from "@navikt/ds-react";
import { useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import type { TillatteHandlingerResponse } from "~/saker/types.backend";
import { byggLagreResultatRequest } from "../resultat-request";
import {
  byggInnsending,
  endreStatus,
  hentHandlinger,
  hentStartverdier,
  type Innsending,
  kanLagreUtenAvslutning,
  type Sakshandling,
  type Trinn,
  type Verdier,
} from "./saksflyt";
import { lagStarttilstand, saksflytReducer } from "./saksflytReducer";
import { BekreftAvslutningTrinn } from "./trinn/BekreftAvslutningTrinn";
import { MenyTrinn } from "./trinn/MenyTrinn";
import { SkjemaTrinn } from "./trinn/SkjemaTrinn";
import { EnkeltvalgTrinn, SjekklisteTrinn, StatusTrinn } from "./trinn/ValgTrinn";
import { validerTrinn } from "./validering";

export type SaksflytStart = "meny" | "endre-status";

type SaksflytModalProps = {
  sakId: string;
  tillatteHandlinger: TillatteHandlingerResponse;
  start: SaksflytStart;
  onClose: () => void;
};

const lagringsfeil = "Kunne ikke lagre endringen. Last inn siden på nytt og prøv igjen.";

function trinntittel(
  trinn: Trinn,
  verdier: Verdier,
  tillatteHandlinger: TillatteHandlingerResponse,
) {
  if (trinn.type === "bekreftAvslutning") return "Avslutt sak";
  if (typeof trinn.tittel === "function")
    return trinn.tittel(verdier, tillatteHandlinger.feltskjema);
  return trinn.tittel;
}

function primærtekst(trinn: Trinn, verdier: Verdier): string {
  return typeof trinn.primær === "function" ? trinn.primær(verdier) : trinn.primær;
}

/** Trinn som åpner en ny del av flyten viser «Tilbake til saksbildet» i stedet for «Tilbake». */
function lukkerVedTilbake(trinn: Trinn): boolean {
  return trinn.type === "sjekkliste" || trinn.type === "bekreftAvslutning";
}

/**
 * Felles modal for å endre steg, registrere resultat og endre status.
 *
 * Hver handling er en liste med trinn (se `saksflyt.ts`). Modalen viser menyen, går gjennom
 * trinnene og sender alt i ett kall etter siste trinn.
 */
export function SaksflytModal({ sakId, tillatteHandlinger, start, onClose }: SaksflytModalProps) {
  const fetcher = useFetcher();
  const erSubmitting = fetcher.state !== "idle";
  const venterPåSvar = useRef(false);
  const [tilstand, dispatch] = useReducer(
    saksflytReducer,
    start === "endre-status"
      ? { handling: endreStatus, verdier: hentStartverdier(endreStatus, tillatteHandlinger) }
      : null,
    lagStarttilstand,
  );

  useEffect(() => {
    if (!venterPåSvar.current || fetcher.state !== "idle") return;
    venterPåSvar.current = false;
    if (
      fetcher.data &&
      typeof fetcher.data === "object" &&
      "ok" in fetcher.data &&
      fetcher.data.ok
    ) {
      dispatch({ type: "lagret" });
    } else {
      dispatch({ type: "settFeil", feil: { "": lagringsfeil } });
    }
  }, [fetcher.data, fetcher.state]);

  function lukk() {
    if (erSubmitting) return;
    onClose();
  }

  function send(handling: Sakshandling, verdier: Verdier, innsending?: Innsending) {
    const formData = byggInnsending(handling, verdier, tillatteHandlinger, innsending);
    if (formData.get("handling") !== "endre_status") {
      try {
        byggLagreResultatRequest(
          formData,
          tillatteHandlinger.feltskjema,
          tillatteHandlinger.tilstand.steg,
          undefined,
          tillatteHandlinger.tilstand.ytelser,
        );
      } catch (feil) {
        dispatch({
          type: "settFeil",
          feil: { "": feil instanceof Error ? feil.message : "Kontroller feltene" },
        });
        return;
      }
    }
    venterPåSvar.current = true;
    fetcher.submit(formData, {
      method: "post",
      action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId)),
    });
  }

  function velgHandling(handling: Sakshandling) {
    const verdier = hentStartverdier(handling, tillatteHandlinger);
    if (handling.trinn.length === 0) {
      send(handling, verdier);
      return;
    }
    dispatch({ type: "velgHandling", handling, verdier, fraMeny: true });
  }

  function fortsett(trinn: Trinn, alleVerdier: Verdier, innsending?: Innsending) {
    if (tilstand.fase !== "trinn") return;
    const feil = validerTrinn(trinn, alleVerdier, tillatteHandlinger);
    if (Object.keys(feil).length > 0) {
      dispatch({ type: "settFeil", feil });
      return;
    }
    const erSisteTrinn = tilstand.trinnIndeks === tilstand.handling.trinn.length - 1;
    if (innsending || erSisteTrinn) {
      send(tilstand.handling, tilstand.verdier, innsending);
    } else {
      dispatch({ type: "neste" });
    }
  }

  if (tilstand.fase === "kvittering") {
    return (
      <Modal open onClose={onClose} aria-label="Lagret" width="small">
        <Modal.Header />
        <Modal.Body>
          <VStack gap="space-8" align="center" className="py-6 text-center">
            <BodyShort weight="semibold">Lagret</BodyShort>
            <BodyShort textColor="subtle">
              Endringen på sak #{getSaksreferanse(sakId)} er lagret.
            </BodyShort>
          </VStack>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="primary" onClick={onClose}>
            Lukk
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }

  const generellFeil = tilstand.feil[""];

  if (tilstand.fase === "meny") {
    return (
      <Modal
        open
        onClose={lukk}
        onBeforeClose={() => !erSubmitting}
        header={{ heading: "Endre steg eller registrer resultat" }}
        width="small"
      >
        <Modal.Body>
          <VStack gap="space-16">
            <MenyTrinn
              handlinger={hentHandlinger(tillatteHandlinger)}
              onVelg={velgHandling}
              deaktivert={erSubmitting}
            />
            {generellFeil && <ErrorMessage showIcon>{generellFeil}</ErrorMessage>}
          </VStack>
        </Modal.Body>
      </Modal>
    );
  }

  const { handling, trinnIndeks, verdier, feil } = tilstand;
  const trinn = handling.trinn[trinnIndeks];
  const alleVerdier = { ...verdier, ...handling.faste };
  const settVerdi = (navn: string, verdi: string) => dispatch({ type: "settVerdi", navn, verdi });
  const trinnProps = {
    verdier: alleVerdier,
    feil,
    onChange: settVerdi,
    tillatteHandlinger,
  };
  const kanGåTilbake = trinnIndeks > 0 || tilstand.fraMeny;
  const kanLagre = kanLagreUtenAvslutning(tillatteHandlinger);
  const visLagreUtenAvslutning =
    trinn.type === "skjema" && trinn.kanLagreUtenAvslutning?.(alleVerdier) === true && kanLagre;
  const primærLagrerUtenAvslutning =
    trinn.type === "skjema" && trinn.lagreUtenAvslutning?.(alleVerdier) === true;

  return (
    <Modal
      open
      onClose={lukk}
      onBeforeClose={() => !erSubmitting}
      header={{ heading: trinntittel(trinn, alleVerdier, tillatteHandlinger) }}
      width="small"
    >
      <Modal.Body>
        <VStack gap="space-16">
          {trinn.type === "sjekkliste" && <SjekklisteTrinn trinn={trinn} {...trinnProps} />}
          {trinn.type === "enkeltvalg" && <EnkeltvalgTrinn trinn={trinn} {...trinnProps} />}
          {trinn.type === "status" && <StatusTrinn trinn={trinn} {...trinnProps} />}
          {trinn.type === "skjema" && <SkjemaTrinn trinn={trinn} {...trinnProps} />}
          {trinn.type === "bekreftAvslutning" && <BekreftAvslutningTrinn />}
          {generellFeil && <ErrorMessage showIcon>{generellFeil}</ErrorMessage>}
        </VStack>
      </Modal.Body>
      <Modal.Footer>
        <VStack gap="space-8" className="w-full">
          <Button
            type="button"
            variant="primary"
            loading={erSubmitting}
            onClick={() =>
              fortsett(
                trinn,
                alleVerdier,
                primærLagrerUtenAvslutning ? { handling: "lagre_resultat" } : undefined,
              )
            }
          >
            {primærtekst(trinn, alleVerdier)}
          </Button>
          {visLagreUtenAvslutning && (
            <Button
              type="button"
              variant="secondary"
              disabled={erSubmitting}
              onClick={() => fortsett(trinn, alleVerdier, { handling: "lagre_resultat" })}
            >
              Registrer resultat, men ikke avslutt
            </Button>
          )}
          {lukkerVedTilbake(trinn) ? (
            <Button type="button" variant="secondary" disabled={erSubmitting} onClick={lukk}>
              Tilbake til saksbildet
            </Button>
          ) : (
            kanGåTilbake && (
              <Button
                type="button"
                variant="secondary"
                disabled={erSubmitting}
                onClick={() => dispatch({ type: "tilbake" })}
              >
                Tilbake
              </Button>
            )
          )}
        </VStack>
      </Modal.Footer>
    </Modal>
  );
}
