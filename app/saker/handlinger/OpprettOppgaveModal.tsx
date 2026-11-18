import { type FieldMetadata, getFormProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { ExclamationmarkTriangleIcon, TasklistIcon } from "@navikt/aksel-icons";
import {
  BodyShort,
  Box,
  Button,
  HGrid,
  InfoCard,
  Loader,
  Modal,
  Radio,
  RadioGroup,
  VStack,
} from "@navikt/ds-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { z } from "zod";
import { sporHendelse } from "~/analytics/analytics";
import { RouteConfig } from "~/routeConfig";
import type { ArkivJournalpost } from "~/saker/arkiv/typer";
import { erGyldigJournalpost, formaterJournalpostdato } from "~/saker/arkiv/visning";
import type { ArkivOversikt } from "~/saker/arkiv/useArkivJournalposter";
import { getSaksreferanse } from "~/saker/id";
import { formaterDato } from "~/utils/date-utils";
import { OppgaveSkjema } from "./OppgaveSkjema";
import { oppgavefeltSkjema } from "./oppgavefelt";
import {
  formaterOppgavePrioritet,
  formaterOppgavetype,
  SammendragRad,
} from "./opprett-formatering";
import { SuksessVisning } from "./SuksessVisning";
import { erTema, formaterTema, temaSkjema } from "./tema";
import { TemaVelger } from "./TemaVelger";
import { useOppgavekodeverk } from "./useOppgavekodeverk";

const utenDokument = "uten-dokument";
const dokumentvalgFeil = "Velg om oppgaven skal knyttes til et dokument";

const opprettOppgaveSkjema = oppgavefeltSkjema.extend({
  tema: temaSkjema,
  journalpostId: z.string({ error: dokumentvalgFeil }).min(1, dokumentvalgFeil),
});

type Steg = "skjema" | "bekreft" | "suksess";

interface OpprettOppgaveModalProps {
  sakId: string;
  åpen: boolean;
  onClose: () => void;
  /** Journalpostene i Gosys som oppgaven kan knyttes til. */
  arkiv: ArkivOversikt;
}

export function OpprettOppgaveModal({ sakId, åpen, onClose, arkiv }: OpprettOppgaveModalProps) {
  const fetcher = useFetcher();
  const submitPågår = useRef(false);
  const forrigeÅpen = useRef(false);
  const [steg, setSteg] = useState<Steg>("skjema");
  const [innsendingFormData, setInnsendingFormData] = useState<FormData | null>(null);
  const [feilmelding, setFeilmelding] = useState<string | null>(null);

  const [form, fields] = useForm({
    id: "opprett-oppgave",
    constraint: getZodConstraint(opprettOppgaveSkjema),
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: opprettOppgaveSkjema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    onSubmit(event) {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      if (formData.get("journalpostId") === utenDokument) {
        formData.delete("journalpostId");
      }
      formData.set("handling", "opprett_oppgave");
      sporHendelse("oppgave bekreftelse vist");
      setFeilmelding(null);
      setInnsendingFormData(formData);
      setSteg("bekreft");
    },
  });

  function handleBekreft() {
    if (!innsendingFormData) return;
    submitPågår.current = true;
    fetcher.submit(innsendingFormData, {
      method: "post",
      action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId)),
    });
  }

  function handleAvbrytBekreftelse() {
    sporHendelse("oppgave avbrutt i bekreftelse");
    setSteg("skjema");
  }

  function nullstill() {
    form.reset();
    setSteg("skjema");
    setInnsendingFormData(null);
    setFeilmelding(null);
  }

  function handleLukk() {
    if (fetcher.state !== "idle") return;
    nullstill();
    onClose();
  }

  const { kanSeArkiv, tilstand: arkivtilstand, hent: hentArkiv } = arkiv;
  useEffect(() => {
    if (åpen && !forrigeÅpen.current) {
      setSteg("skjema");
      setInnsendingFormData(null);
      setFeilmelding(null);
      if (
        kanSeArkiv &&
        (arkivtilstand.status === "ikke-hentet" || arkivtilstand.status === "feil")
      ) {
        hentArkiv();
      }
    }
    forrigeÅpen.current = åpen;
  }, [åpen, kanSeArkiv, arkivtilstand.status, hentArkiv]);

  const valgtTema = erTema(fields.tema.value) ? fields.tema.value : undefined;
  const { tilstand: kodeverk, prøvIgjen: hentKodeverkPåNytt } = useOppgavekodeverk(valgtTema);
  const oppgavetyper = kodeverk.status === "ok" ? kodeverk.kodeverk.oppgavetyper : [];
  const gjelderverdier = kodeverk.status === "ok" ? kodeverk.kodeverk.gjelderverdier : [];

  const journalposter = arkivtilstand.status === "ok" ? arkivtilstand.journalposter : [];
  const valgtJournalpost = journalposter.find(
    (journalpost) => journalpost.journalpostId === innsendingFormData?.get("journalpostId"),
  );

  useEffect(() => {
    if (!submitPågår.current || fetcher.state !== "idle") return;

    if (fetcher.data && "ok" in fetcher.data && fetcher.data.ok) {
      sporHendelse("oppgave opprettet", {
        knyttetTil: innsendingFormData?.has("journalpostId")
          ? "valgt journalpost"
          : "uten dokumenttilknytning",
      });
      setFeilmelding(null);
      setSteg("suksess");
    } else {
      setFeilmelding("Kunne ikke opprette oppgave. Prøv igjen.");
      setSteg("bekreft");
    }
    submitPågår.current = false;
  }, [fetcher.data, fetcher.state, innsendingFormData]);

  return (
    <Modal
      open={åpen}
      onClose={handleLukk}
      header={
        steg === "suksess"
          ? undefined
          : { heading: "Opprett oppgave i Gosys", icon: <TasklistIcon aria-hidden /> }
      }
      aria-label={steg === "suksess" ? "Oppgave opprettet" : "Opprett oppgave i Gosys"}
      width={steg === "skjema" ? "medium" : "small"}
    >
      {steg === "suksess" && <Modal.Header />}
      <fetcher.Form method="post" {...getFormProps(form)} name="opprett-oppgave">
        <Modal.Body>
          {steg === "skjema" && (
            <VStack gap="space-4">
              <TemaVelger felt={fields.tema} />
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
              <hr className="my-2 border-ax-border-neutral-subtle" />
              <JournalpostValg
                kanSeArkiv={kanSeArkiv}
                tilstand={arkivtilstand}
                onPrøvIgjen={hentArkiv}
                felt={fields.journalpostId}
              />
            </VStack>
          )}
          {steg === "bekreft" && innsendingFormData && (
            <VStack gap="space-16">
              <BodyShort>Du oppretter nå en oppgave:</BodyShort>
              <Box background="neutral-soft" padding="space-16" borderRadius="8">
                <HGrid columns="auto 1fr" gap="space-4 space-16">
                  <SammendragRad
                    label="Tema"
                    verdi={formaterTema(innsendingFormData.get("tema")?.toString() ?? "")}
                  />
                  <SammendragRad
                    label="Type"
                    verdi={
                      oppgavetyper.find(
                        (type) => type.oppgavetype === innsendingFormData.get("oppgavetype"),
                      )?.term ??
                      formaterOppgavetype(innsendingFormData.get("oppgavetype")?.toString() ?? "")
                    }
                  />
                  <SammendragRad
                    label="Prioritet"
                    verdi={formaterOppgavePrioritet(
                      innsendingFormData.get("prioritet")?.toString() ?? "",
                    )}
                  />
                  <SammendragRad
                    label="Frist"
                    verdi={formaterDato(innsendingFormData.get("frist")?.toString() ?? "")}
                  />
                  <SammendragRad
                    label="Gjelderverdi"
                    verdi={
                      gjelderverdier.find(
                        (valg) => valg.behandlingstema === innsendingFormData.get("gjelderverdi"),
                      )?.behandlingstemaTerm ?? ""
                    }
                  />
                  <SammendragRad
                    label="Beskrivelse"
                    verdi={innsendingFormData.get("beskrivelse")?.toString() ?? ""}
                  />
                  <SammendragRad
                    label="Journalføring"
                    verdi={
                      valgtJournalpost
                        ? journalposttittel(valgtJournalpost)
                        : "Ingen dokumenttilknytning"
                    }
                  />
                </HGrid>
              </Box>
              {feilmelding && (
                <InfoCard size="small" data-color="danger">
                  <InfoCard.Message icon={<ExclamationmarkTriangleIcon aria-hidden />}>
                    {feilmelding}
                  </InfoCard.Message>
                </InfoCard>
              )}
            </VStack>
          )}
          {steg === "suksess" && (
            <SuksessVisning
              tittel="Oppgave opprettet"
              tekst="Oppgaven er opprettet og lagret på saken."
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          {steg === "skjema" && (
            <>
              <Button type="submit" variant="primary" disabled={fetcher.state !== "idle"}>
                Lagre
              </Button>
              <Button type="button" variant="secondary" onClick={handleLukk}>
                Avbryt
              </Button>
            </>
          )}
          {steg === "bekreft" && (
            <>
              <Button
                type="button"
                variant="primary"
                onClick={handleBekreft}
                loading={fetcher.state !== "idle"}
                disabled={fetcher.state !== "idle"}
                autoFocus
              >
                Opprett
              </Button>
              <Button type="button" variant="secondary" onClick={handleAvbrytBekreftelse}>
                Avbryt
              </Button>
            </>
          )}
          {steg === "suksess" && (
            <Button type="button" variant="primary" onClick={handleLukk} autoFocus>
              Lukk
            </Button>
          )}
        </Modal.Footer>
      </fetcher.Form>
    </Modal>
  );
}

function journalposttittel(journalpost: ArkivJournalpost): string {
  return journalpost.tittel ?? "Uten tittel";
}

function JournalpostValg({
  kanSeArkiv,
  tilstand,
  onPrøvIgjen,
  felt,
}: {
  kanSeArkiv: boolean;
  tilstand: ArkivOversikt["tilstand"];
  onPrøvIgjen: () => void;
  felt: FieldMetadata<string | undefined>;
}) {
  const legend = "Knytt til journalførte dokumenter i Gosys";
  const feil = felt.errors?.[0];
  const journalposter =
    kanSeArkiv && tilstand.status === "ok"
      ? tilstand.journalposter.filter(erGyldigJournalpost)
      : [];
  let melding: ReactNode;

  if (!kanSeArkiv || tilstand.status !== "ok" || journalposter.length === 0) {
    if (!kanSeArkiv) {
      melding = "Du har ikke tilgang til dokumentoversikten i Gosys for denne saken.";
    } else if (tilstand.status === "ikke-hentet" || tilstand.status === "laster") {
      melding = <Loader size="small" title="Henter journalførte dokumenter fra Gosys" />;
    } else if (tilstand.status === "feil" && tilstand.årsak === "utlogget") {
      melding = "Sesjonen din er utløpt. Last inn siden på nytt for å logge inn.";
    } else if (tilstand.status === "feil") {
      melding = (
        <VStack gap="space-8" align="start">
          <BodyShort size="small">Kunne ikke hente journalførte dokumenter fra Gosys.</BodyShort>
          <Button type="button" size="small" variant="secondary" onClick={onPrøvIgjen}>
            Prøv igjen
          </Button>
        </VStack>
      );
    } else {
      melding =
        "Saken har ingen journalførte dokumenter i Gosys. Hvis du ønsker å knytte oppgaven til et dokument, må du arkivere dokumentet før du oppretter en oppgave.";
    }
  }

  return (
    <RadioGroup
      key={felt.key}
      name={felt.name}
      legend={legend}
      description={melding}
      error={feil}
      defaultValue={felt.value ?? ""}
    >
      <Radio value={utenDokument}>Opprett oppgave uten tilknytning til et dokument</Radio>
      {journalposter.map((journalpost) => (
        <Radio
          key={journalpost.journalpostId}
          value={journalpost.journalpostId}
          description={`Journalført ${formaterJournalpostdato(journalpost.datoOpprettet)}`}
        >
          {journalposttittel(journalpost)}
        </Radio>
      ))}
    </RadioGroup>
  );
}
