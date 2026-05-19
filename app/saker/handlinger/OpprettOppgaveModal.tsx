import { getFormProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { TasklistIcon } from "@navikt/aksel-icons";
import { Button, Modal, VStack } from "@navikt/ds-react";
import { useFetcher } from "react-router";
import { z } from "zod";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import { OppgaveSkjema } from "./OppgaveSkjema";

const opprettOppgaveSkjema = z.object({
  oppgavetype: z.string().optional(),
  prioritet: z.string().optional(),
  frist: z.string().optional(),
  behandlendeEnhet: z.string().optional(),
  beskrivelse: z.string().optional(),
});

interface OpprettOppgaveModalProps {
  sakId: string;
  åpen: boolean;
  onClose: () => void;
}

export function OpprettOppgaveModal({ sakId, åpen, onClose }: OpprettOppgaveModalProps) {
  const fetcher = useFetcher();

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
      fetcher.submit(formData, {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId)),
      });
      form.reset();
      onClose();
    },
  });

  function handleLukk() {
    form.reset();
    onClose();
  }

  return (
    <Modal
      open={åpen}
      onClose={handleLukk}
      header={{ heading: "Opprett oppgave", icon: <TasklistIcon aria-hidden /> }}
      width="medium"
    >
      <Modal.Body>
        <fetcher.Form method="post" {...getFormProps(form)} name="opprett-oppgave">
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
        </fetcher.Form>
      </Modal.Body>
      <Modal.Footer>
        <Button type="submit" form="opprett-oppgave" variant="primary">
          Lagre
        </Button>
        <Button type="button" variant="secondary" onClick={handleLukk}>
          Avbryt
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
