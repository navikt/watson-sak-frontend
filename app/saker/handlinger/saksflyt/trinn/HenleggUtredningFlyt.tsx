import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { CheckmarkCircleFillIcon, TasklistIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, ErrorMessage, Heading, Modal, VStack } from "@navikt/ds-react";
import { useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import { erTekniskFeilSvar } from "~/feilhåndtering/Innsendingsfeil";
import type {
  Henleggelsesnotattype,
  HenleggelsesnotatResultat,
  TillatteHandlingerResponse,
} from "~/saker/types.backend";
import { notattypeEtiketter } from "~/saker/visning";
import type { Sakshandling, Trinn, Verdier } from "../saksflyt";
import {
  byggNotater,
  journalførteNotattyper,
  kvitteringstekst,
  NOTATTYPER,
  orienteringsnotatJournalpostId,
  tomtNotatvalg,
  type Notatvalg,
} from "../henleggelsesnotater";
import type { Feil } from "../validering";
import { Avslutningsvarsel } from "./Avslutningsvarsel";
import { NotatValg } from "./NotatValg";
import { OppgaveTrinn } from "./OppgaveTrinn";
import { EnkeltvalgTrinn } from "./ValgTrinn";

type Delsteg = "valg" | "kvittering" | "oppgave" | "bekreft" | "avbrutt";

type HenleggUtredningFlytProps = {
  sakId: string;
  handling: Sakshandling;
  verdier: Verdier;
  feil: Feil;
  tillatteHandlinger: TillatteHandlingerResponse;
  modalRef: RefObject<HTMLDialogElement | null>;
  /** Pågående innsending av selve avslutningen. */
  erSubmitting: boolean;
  /** Feilvisning for avslutningen. Vises i alle delsteg. */
  avslutningsfeil: ReactNode;
  onChange: (navn: string, verdi: string) => void;
  /** Validerer årsaken. Returnerer `false` og viser feil hvis den mangler. */
  onValiderÅrsak: () => boolean;
  onAvslutt: () => void;
  onLukk: () => void;
};

const registreringsfeil = "Kunne ikke registrere notatene. Prøv igjen.";
const arkiveringsfeil = (type: Henleggelsesnotattype) =>
  `${notattypeEtiketter[type]}et kunne ikke arkiveres. Prøv igjen.`;

/**
 * Henlegging fra utredning: årsak og valgfrie notater, kvittering, oppgave til orienteringsnotatet
 * og bekreftelse. Teksten i notatene finnes bare i denne komponentens tilstand. Den sendes til
 * action og blir verken logget, sendt til analytics eller lagret i nettleseren.
 */
export function HenleggUtredningFlyt({
  sakId,
  handling,
  verdier,
  feil,
  tillatteHandlinger,
  modalRef,
  erSubmitting,
  avslutningsfeil,
  onChange,
  onValiderÅrsak,
  onAvslutt,
  onLukk,
}: HenleggUtredningFlytProps) {
  const fetcher = useFetcher();
  const venterPåSvar = useRef(false);
  const feltRefs = useRef<Partial<Record<Henleggelsesnotattype, HTMLElement | null>>>({});
  const overskriftRef = useRef<HTMLHeadingElement>(null);

  const [delsteg, settDelsteg] = useState<Delsteg>("valg");
  const [kortÅpent, settKortÅpent] = useState(false);
  const [valg, settValg] = useState<Notatvalg>(tomtNotatvalg);
  const [åpneFelt, settÅpneFelt] = useState({ HENLEGGELSESNOTAT: false, ORIENTERINGSNOTAT: false });
  const [notatfeil, settNotatfeil] = useState<Partial<Record<Henleggelsesnotattype, string>>>({});
  const [generellFeil, settGenerellFeil] = useState<string | null>(null);
  const [resultater, settResultater] = useState<HenleggelsesnotatResultat[]>([]);
  const [fokuserFeil, settFokuserFeil] = useState<Henleggelsesnotattype | null>(null);

  const sendtInn = fetcher.state !== "idle";
  const journalførte = journalførteNotattyper(resultater);
  const orienteringsJournalpostId = orienteringsnotatJournalpostId(resultater);

  // Fokus flyttes til overskriften ved trinnbytte, slik at skjermlesere leser den opp.
  // Modalen setter selv fokus på lukkeknappen når den åpnes, så flyttingen venter til etterpå.
  useEffect(() => {
    const tidtaker = setTimeout(() => {
      const overskrift =
        overskriftRef.current ??
        (() => {
          const id = modalRef.current?.getAttribute("aria-labelledby");
          return id ? document.getElementById(id) : null;
        })();
      if (overskrift) {
        overskrift.tabIndex = -1;
        overskrift.focus();
      } else {
        modalRef.current?.focus();
      }
    }, 0);
    return () => clearTimeout(tidtaker);
  }, [delsteg, modalRef]);

  useEffect(() => {
    if (fokuserFeil) {
      feltRefs.current[fokuserFeil]?.focus();
      settFokuserFeil(null);
    }
  }, [fokuserFeil]);

  useEffect(() => {
    if (!venterPåSvar.current || fetcher.state !== "idle") return;
    venterPåSvar.current = false;
    const svar = fetcher.data;
    if (svar && typeof svar === "object" && "ok" in svar && svar.ok && "notater" in svar) {
      const notater = svar.notater as HenleggelsesnotatResultat[];
      settResultater(notater);
      const feilede = notater.filter((notat) => notat.utfall === "FEILET");
      if (feilede.length === 0) {
        settNotatfeil({});
        settDelsteg("kvittering");
        return;
      }
      settNotatfeil(
        Object.fromEntries(
          feilede.map((notat) => [notat.notattype, arkiveringsfeil(notat.notattype)]),
        ),
      );
      // Teksten som feilet må være synlig for at feilen skal kobles til feltet.
      settÅpneFelt((åpne) => ({
        ...åpne,
        ...Object.fromEntries(feilede.map((notat) => [notat.notattype, true])),
      }));
      settKortÅpent(true);
      settFokuserFeil(feilede[0].notattype);
      return;
    }
    if (!erTekniskFeilSvar(svar) && svar && typeof svar === "object" && "feil" in svar) {
      settGenerellFeil(typeof svar.feil === "string" ? svar.feil : registreringsfeil);
    } else {
      settGenerellFeil(registreringsfeil);
    }
  }, [fetcher.data, fetcher.state]);

  const valgteNotater = byggNotater(valg);

  function registrerEllerFortsett() {
    if (!onValiderÅrsak()) return;
    settGenerellFeil(null);
    settNotatfeil({});
    if (valgteNotater.length === 0) {
      settDelsteg("kvittering");
      return;
    }
    venterPåSvar.current = true;
    const formData = new FormData();
    formData.set("handling", "registrer_henleggelsesnotater");
    formData.set("notater", JSON.stringify(valgteNotater));
    fetcher.submit(formData, {
      method: "post",
      action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId)),
    });
  }

  function endreTekst(type: Henleggelsesnotattype, tekst: string) {
    settValg((forrige) => ({
      valgt: { ...forrige.valgt, [type]: tekst.trim() !== "" ? true : forrige.valgt[type] },
      tekst: { ...forrige.tekst, [type]: tekst },
    }));
    settNotatfeil((forrige) => ({ ...forrige, [type]: undefined }));
  }

  function endreValgte(valgte: Henleggelsesnotattype[]) {
    settValg((forrige) => ({
      ...forrige,
      valgt: Object.fromEntries(
        NOTATTYPER.map((type) => [type, valgte.includes(type)]),
      ) as Notatvalg["valgt"],
    }));
  }

  /** Avbryt etter at notater er arkivert, skal gi beskjed om at saken fortsatt er åpen. */
  function avbryt() {
    if (journalførte.length > 0) settDelsteg("avbrutt");
    else onLukk();
  }

  const knappestil = "w-full";

  if (delsteg === "oppgave" && orienteringsJournalpostId) {
    return (
      <Modal
        ref={modalRef}
        open
        onClose={onLukk}
        width="medium"
        header={{
          heading: "Knytt oppgave til orienteringsnotat",
          icon: <TasklistIcon aria-hidden />,
        }}
      >
        <OppgaveTrinn
          sakId={sakId}
          journalpostId={orienteringsJournalpostId}
          onTilbake={() => settDelsteg("kvittering")}
          onOpprettet={() => settDelsteg("bekreft")}
        />
      </Modal>
    );
  }

  if (delsteg === "avbrutt") {
    return (
      <Modal
        ref={modalRef}
        open
        onClose={onLukk}
        header={{ heading: "Saken er fortsatt åpen" }}
        width="small"
      >
        <Modal.Body>
          <BodyShort>Notatet er arkivert. Saken er fortsatt åpen.</BodyShort>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="primary" className={knappestil} onClick={onLukk}>
            Lukk
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }

  if (delsteg === "kvittering" || delsteg === "bekreft") {
    const tekst = kvitteringstekst(journalførte);
    const opprettetOppgave = delsteg === "bekreft";
    return (
      <Modal
        ref={modalRef}
        open
        onClose={onLukk}
        onBeforeClose={() => !erSubmitting}
        width="small"
        {...(tekst || opprettetOppgave
          ? { "aria-label": "Avslutt sak" }
          : { header: { heading: "Avslutt sak" } })}
      >
        {(tekst || opprettetOppgave) && <Modal.Header />}
        <Modal.Body>
          <VStack gap="space-16">
            {(tekst || opprettetOppgave) && (
              <VStack gap="space-8" align="center" className="text-center">
                <CheckmarkCircleFillIcon
                  aria-hidden
                  fontSize="3rem"
                  className="text-ax-bg-success-strong"
                />
                <Heading ref={overskriftRef} level="2" size="small">
                  {opprettetOppgave
                    ? "Oppgaven er opprettet og knyttet til orienteringsnotatet"
                    : tekst}
                </Heading>
                {!opprettetOppgave && orienteringsJournalpostId && (
                  <BodyShort textColor="subtle">
                    Du kan knytte en oppgave til orienteringsnotatet.
                  </BodyShort>
                )}
              </VStack>
            )}
            <Avslutningsvarsel />
            {avslutningsfeil}
          </VStack>
        </Modal.Body>
        <Modal.Footer>
          <VStack gap="space-8" className="w-full">
            <Button
              type="button"
              variant="primary"
              className={knappestil}
              loading={erSubmitting}
              onClick={onAvslutt}
            >
              Avslutt sak
            </Button>
            {!opprettetOppgave && orienteringsJournalpostId && (
              <Button
                type="button"
                variant="secondary"
                className={knappestil}
                disabled={erSubmitting}
                onClick={() => settDelsteg("oppgave")}
              >
                Knytt til oppgave
              </Button>
            )}
            <Button
              type="button"
              variant="tertiary"
              className={knappestil}
              disabled={erSubmitting}
              onClick={avbryt}
            >
              Avbryt
            </Button>
          </VStack>
        </Modal.Footer>
      </Modal>
    );
  }

  const årsaktrinn = handling.trinn[0] as Extract<Trinn, { type: "enkeltvalg" }>;
  return (
    <Modal
      ref={modalRef}
      open
      onClose={onLukk}
      onBeforeClose={() => !sendtInn}
      header={{ heading: "Henlegg sak" }}
      width="small"
    >
      <Modal.Body>
        <VStack gap="space-16">
          <EnkeltvalgTrinn
            trinn={årsaktrinn}
            verdier={{ ...verdier, ...handling.faste }}
            feil={feil}
            onChange={onChange}
            tillatteHandlinger={tillatteHandlinger}
          />
          <hr className="border-ax-border-neutral-subtle" />
          <NotatValg
            valg={valg}
            åpneFelt={åpneFelt}
            feil={notatfeil}
            åpen={kortÅpent}
            deaktivert={sendtInn}
            registrerFeltref={(type, element) => {
              feltRefs.current[type] = element;
            }}
            onÅpenEndret={settKortÅpent}
            onValgtEndret={endreValgte}
            onTekstEndret={endreTekst}
            onFeltÅpnet={(type, åpent) =>
              settÅpneFelt((forrige) => ({ ...forrige, [type]: åpent }))
            }
          />
          {generellFeil && <ErrorMessage showIcon>{generellFeil}</ErrorMessage>}
          {avslutningsfeil}
        </VStack>
      </Modal.Body>
      <Modal.Footer>
        <VStack gap="space-8" className="w-full">
          <Button
            type="button"
            variant="primary"
            className={knappestil}
            loading={sendtInn}
            onClick={registrerEllerFortsett}
          >
            Avslutt sak
          </Button>
          <Button
            type="button"
            variant="tertiary"
            className={knappestil}
            disabled={sendtInn}
            onClick={avbryt}
          >
            Avbryt
          </Button>
        </VStack>
      </Modal.Footer>
    </Modal>
  );
}
