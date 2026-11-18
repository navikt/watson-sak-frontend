import { getFormProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { ExclamationmarkTriangleIcon, TasklistIcon } from "@navikt/aksel-icons";
import { BodyShort, Box, Button, HGrid, InfoCard, Modal, VStack } from "@navikt/ds-react";
import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import { OppgaveSkjema } from "../OppgaveSkjema";
import { oppgavefeltSkjema } from "../oppgavefelt";
import { SuksessVisning } from "../SuksessVisning";
import { ListeSammendrag, SammendragRad } from "../opprett-formatering";
import { formaterTema } from "../tema";
import { useOppgavekodeverk } from "../useOppgavekodeverk";
import { journalførteDokumenter } from "./journalforte-dokumenter";
import type { ArkivertJournalpost } from "./ArkiverDokumenterModal";

interface KnyttOppgaveModalProps {
  sakId: string;
  /** Journalposten oppgaven knyttes til. Modalen er åpen når denne er satt. */
  journalpost: ArkivertJournalpost | null;
  onClose: () => void;
}

/** Oppretter en oppgave i Gosys knyttet til journalposten som nettopp ble arkivert. */
export function KnyttOppgaveModal({ sakId, journalpost, onClose }: KnyttOppgaveModalProps) {
  const fetcher = useFetcher();
  const submitPågår = useRef(false);
  const [opprettet, settOpprettet] = useState(false);
  const [feilmelding, settFeilmelding] = useState<string | null>(null);

  const [form, fields] = useForm({
    id: "knytt-oppgave",
    constraint: getZodConstraint(oppgavefeltSkjema),
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: oppgavefeltSkjema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    onSubmit(event, { formData }) {
      event.preventDefault();
      if (!journalpost) return;
      formData.set("handling", "opprett_oppgave");
      formData.set("tema", journalpost.tema);
      formData.set("journalpostId", journalpost.journalpostId);
      submitPågår.current = true;
      settFeilmelding(null);
      fetcher.submit(formData, {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId)),
      });
    },
  });

  function handleLukk() {
    if (fetcher.state !== "idle") return;
    form.reset();
    settOpprettet(false);
    settFeilmelding(null);
    onClose();
  }

  useEffect(() => {
    if (!submitPågår.current || fetcher.state !== "idle") return;
    submitPågår.current = false;
    if (fetcher.data && "ok" in fetcher.data && fetcher.data.ok) {
      sporHendelse("oppgave opprettet", { knyttetTil: "arkivering" });
      settOpprettet(true);
    } else {
      settFeilmelding("Kunne ikke opprette oppgave. Prøv igjen.");
    }
  }, [fetcher.data, fetcher.state]);

  const { tilstand: kodeverk, prøvIgjen: hentKodeverkPåNytt } = useOppgavekodeverk(
    journalpost?.tema,
  );
  const senderInn = fetcher.state !== "idle";
  const tittel = `Knytt oppgave til ${journalførteDokumenter(journalpost?.dokumentnavn.length === 1)}`;

  return (
    <Modal
      open={journalpost !== null}
      onClose={handleLukk}
      header={
        opprettet
          ? undefined
          : {
              heading: tittel,
              icon: <TasklistIcon aria-hidden />,
            }
      }
      aria-label={opprettet ? "Oppgave opprettet" : tittel}
      width={opprettet ? "small" : "medium"}
    >
      {opprettet && <Modal.Header />}
      <fetcher.Form method="post" {...getFormProps(form)}>
        <Modal.Body>
          {opprettet ? (
            <SuksessVisning
              tittel="Oppgave opprettet"
              tekst={`Oppgaven er opprettet og knyttet til ${journalførteDokumenter(journalpost?.dokumentnavn.length === 1)}.`}
            />
          ) : (
            <VStack gap="space-16">
              {journalpost && (
                <VStack gap="space-4">
                  <BodyShort size="small" textColor="subtle">
                    Journalføring i Gosys oppgaven knyttes til
                  </BodyShort>
                  <Box
                    background="neutral-soft"
                    paddingInline="space-16"
                    paddingBlock="space-12"
                    borderRadius="8"
                    borderWidth="1"
                    borderColor="neutral-subtle"
                  >
                    <HGrid columns="auto 1fr" gap="space-12">
                      <SammendragRad
                        label="Tema"
                        verdi={formaterTema(journalpost.tema)}
                        fremhevet
                      />
                      <SammendragRad
                        label="Dokumentbeskrivelse"
                        verdi={journalpost.dokumentbeskrivelse}
                        fremhevet
                      />
                      <ListeSammendrag
                        label="Filer og dokumenter"
                        navn={journalpost.dokumentnavn}
                      />
                    </HGrid>
                  </Box>
                </VStack>
              )}
              <OppgaveSkjema
                fields={{
                  oppgavetype: fields.oppgavetype,
                  prioritet: fields.prioritet,
                  frist: fields.frist,
                  behandlendeEnhet: fields.behandlendeEnhet,
                  gjelderverdi: fields.gjelderverdi,
                  beskrivelse: fields.beskrivelse,
                }}
                kodeverk={kodeverk}
                onPrøvIgjen={hentKodeverkPåNytt}
              />
              {feilmelding && (
                <InfoCard size="small" data-color="danger">
                  <InfoCard.Message icon={<ExclamationmarkTriangleIcon aria-hidden />}>
                    {feilmelding}
                  </InfoCard.Message>
                </InfoCard>
              )}
            </VStack>
          )}
        </Modal.Body>
        <Modal.Footer>
          {opprettet ? (
            <Button type="button" variant="primary" onClick={handleLukk} autoFocus>
              Lukk
            </Button>
          ) : (
            <>
              <Button type="submit" variant="primary" loading={senderInn} disabled={senderInn}>
                Opprett oppgave
              </Button>
              <Button type="button" variant="secondary" onClick={handleLukk}>
                Avbryt
              </Button>
            </>
          )}
        </Modal.Footer>
      </fetcher.Form>
    </Modal>
  );
}
