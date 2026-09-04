import { getFormProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import {
  CheckmarkCircleFillIcon,
  ExclamationmarkTriangleIcon,
  TasklistIcon,
} from "@navikt/aksel-icons";
import { BodyShort, Box, Button, HGrid, InfoCard, Modal, VStack } from "@navikt/ds-react";
import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { z } from "zod";
import { sporHendelse } from "~/analytics/analytics";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import { formaterDato } from "~/utils/date-utils";
import { OppgaveSkjema } from "./OppgaveSkjema";

const opprettOppgaveSkjema = z.object({
  oppgavetype: z.string({ error: "Velg oppgavetype" }).min(1, "Velg oppgavetype"),
  prioritet: z.string({ error: "Velg prioritet" }).min(1, "Velg prioritet"),
  frist: z.string({ error: "Velg frist" }).min(1, "Velg frist"),
  behandlendeEnhet: z.string({ error: "Velg behandlende enhet" }).min(1, "Velg behandlende enhet"),
  beskrivelse: z.string({ error: "Skriv en beskrivelse" }).trim().min(1, "Skriv en beskrivelse"),
});

type Steg = "skjema" | "bekreft" | "suksess";

function SammendragRad({ label, verdi }: { label: string; verdi: React.ReactNode }) {
  return (
    <>
      <BodyShort size="small" textColor="subtle">
        {label}
      </BodyShort>
      <BodyShort size="small">{verdi}</BodyShort>
    </>
  );
}

function formaterOppgavetype(type: string): string {
  const etiketter: Record<string, string> = {
    VUR: "Vurder dokument",
    VURD_HENV: "Vurder henvendelse",
    VUR_KONS_YTE: "Vurder konsekvens for ytelse",
  };
  return etiketter[type] ?? type;
}

function formaterOppgavePrioritet(prioritet: string): string {
  const etiketter: Record<string, string> = {
    LAV: "Lav",
    NORMAL: "Normal",
    HOY: "Høy",
  };
  return etiketter[prioritet] ?? prioritet;
}

interface OpprettOppgaveModalProps {
  sakId: string;
  åpen: boolean;
  onClose: () => void;
}

export function OpprettOppgaveModal({ sakId, åpen, onClose }: OpprettOppgaveModalProps) {
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
    onSubmit(event, { formData }) {
      event.preventDefault();
      formData.set("handling", "opprett_oppgave");
      sporHendelse("oppgave bekreftelse vist");
      setFeilmelding(null);
      setInnsendingFormData(formData);
      setSteg("bekreft");
    },
  });

  function handleBekreft() {
    if (!innsendingFormData) return;
    sporHendelse("oppgave opprettet");
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

  useEffect(() => {
    if (åpen && !forrigeÅpen.current) {
      setSteg("skjema");
      setInnsendingFormData(null);
      setFeilmelding(null);
    }
    forrigeÅpen.current = åpen;
  }, [åpen]);

  useEffect(() => {
    if (!submitPågår.current || fetcher.state !== "idle") return;

    if (fetcher.data && "ok" in fetcher.data && fetcher.data.ok) {
      setFeilmelding(null);
      setSteg("suksess");
    } else {
      setFeilmelding("Kunne ikke opprette oppgave. Prøv igjen.");
      setSteg("bekreft");
    }
    submitPågår.current = false;
  }, [fetcher.data, fetcher.state]);

  return (
    <Modal
      open={åpen}
      onClose={handleLukk}
      closeOnBackdropClick
      header={
        steg === "suksess"
          ? undefined
          : { heading: "Opprett oppgave", icon: <TasklistIcon aria-hidden /> }
      }
      aria-label={steg === "suksess" ? "Oppgave opprettet" : "Opprett oppgave"}
      width={steg === "skjema" ? "medium" : "small"}
    >
      {steg === "suksess" && <Modal.Header />}
      <fetcher.Form method="post" {...getFormProps(form)} name="opprett-oppgave">
        <Modal.Body>
          {steg === "skjema" && (
            <VStack gap="space-4">
              <OppgaveSkjema
                fields={{
                  oppgavetype: fields.oppgavetype,
                  prioritet: fields.prioritet,
                  frist: fields.frist,
                  behandlendeEnhet: fields.behandlendeEnhet,
                  beskrivelse: fields.beskrivelse,
                }}
              />
            </VStack>
          )}
          {steg === "bekreft" && innsendingFormData && (
            <VStack gap="space-16">
              <BodyShort>Du oppretter nå en oppgave:</BodyShort>
              <Box background="neutral-soft" padding="space-16" borderRadius="8">
                <HGrid columns="auto 1fr" gap="space-4 space-16">
                  <SammendragRad
                    label="Type"
                    verdi={formaterOppgavetype(
                      innsendingFormData.get("oppgavetype")?.toString() ?? "",
                    )}
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
                    label="Beskrivelse"
                    verdi={innsendingFormData.get("beskrivelse")?.toString() ?? ""}
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
            <VStack gap="space-16" align="center" className="py-6 text-center">
              <CheckmarkCircleFillIcon
                aria-hidden
                fontSize="3rem"
                className="text-ax-bg-success-strong"
              />
              <VStack gap="space-4" align="center">
                <BodyShort weight="semibold">Oppgave opprettet</BodyShort>
                <BodyShort textColor="subtle">Oppgaven er opprettet og lagret på saken.</BodyShort>
              </VStack>
            </VStack>
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
              <Button type="button" variant="secondary" onClick={handleAvbrytBekreftelse}>
                Avbryt
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleBekreft}
                loading={fetcher.state !== "idle"}
                disabled={fetcher.state !== "idle"}
              >
                Opprett
              </Button>
            </>
          )}
          {steg === "suksess" && (
            <Button type="button" variant="primary" onClick={handleLukk}>
              Lukk
            </Button>
          )}
        </Modal.Footer>
      </fetcher.Form>
    </Modal>
  );
}
