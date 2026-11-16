import { getFormProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { ExclamationmarkTriangleIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, HStack, InfoCard, Modal, VStack } from "@navikt/ds-react";
import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import { OppgaveSkjema } from "../../OppgaveSkjema";
import { oppgavefeltSkjema } from "../../oppgavefelt";
import { useOppgavekodeverk } from "../../useOppgavekodeverk";

type OppgaveTrinnProps = {
  sakId: string;
  journalpostId: string;
  onTilbake: () => void;
  onOpprettet: () => void;
};

/** Oppretter en oppgave knyttet til orienteringsnotatet. Innholdet i modalen, uten selve `Modal`. */
export function OppgaveTrinn({ sakId, journalpostId, onTilbake, onOpprettet }: OppgaveTrinnProps) {
  const fetcher = useFetcher();
  const submitPågår = useRef(false);
  const [feilmelding, settFeilmelding] = useState<string | null>(null);
  const { tilstand: kodeverk, prøvIgjen } = useOppgavekodeverk("KTR");
  const senderInn = fetcher.state !== "idle";

  const [form, fields] = useForm({
    id: "knytt-oppgave-orienteringsnotat",
    constraint: getZodConstraint(oppgavefeltSkjema),
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: oppgavefeltSkjema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    onSubmit(event, { formData }) {
      event.preventDefault();
      formData.set("handling", "opprett_oppgave");
      formData.set("tema", "KTR");
      formData.set("journalpostId", journalpostId);
      submitPågår.current = true;
      settFeilmelding(null);
      fetcher.submit(formData, {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId)),
      });
    },
  });

  useEffect(() => {
    if (!submitPågår.current || fetcher.state !== "idle") return;
    submitPågår.current = false;
    if (fetcher.data && "ok" in fetcher.data && fetcher.data.ok) {
      sporHendelse("oppgave opprettet", { knyttetTil: "orienteringsnotat" });
      onOpprettet();
    } else {
      settFeilmelding("Kunne ikke opprette oppgave. Saken er ikke avsluttet. Prøv igjen.");
    }
  }, [fetcher.data, fetcher.state, onOpprettet]);

  return (
    <fetcher.Form method="post" {...getFormProps(form)}>
      <Modal.Body>
        <VStack gap="space-16">
          <BodyShort size="small" textColor="subtle">
            Journalføring i Gosys oppgaven knyttes til dokumentet «Orienteringsnotat».
          </BodyShort>
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
            onPrøvIgjen={prøvIgjen}
          />
          {feilmelding && (
            <InfoCard size="small" data-color="danger">
              <InfoCard.Message icon={<ExclamationmarkTriangleIcon aria-hidden />}>
                <span role="alert">{feilmelding}</span>
              </InfoCard.Message>
            </InfoCard>
          )}
        </VStack>
      </Modal.Body>
      <Modal.Footer>
        <VStack gap="space-12" className="w-full">
          <BodyShort size="small" textColor="subtle">
            Registrert notat vil være arkivert i Gosys selv om du ikke avslutter saken ennå.
          </BodyShort>
          <HStack justify="end" gap="space-8" wrap>
            <Button type="button" variant="secondary" disabled={senderInn} onClick={onTilbake}>
              Avbryt
            </Button>
            <Button type="submit" variant="primary" loading={senderInn}>
              Arkiver oppgave og avslutt sak
            </Button>
          </HStack>
        </VStack>
      </Modal.Footer>
    </fetcher.Form>
  );
}
