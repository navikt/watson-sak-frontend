import { getFormProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { PersonPencilIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Modal, Select, VStack } from "@navikt/ds-react";
import { useFetcher } from "react-router";
import { z } from "zod";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import type { KontrollsakSaksbehandler } from "~/saker/types.backend";

const overforSkjema = z.object({
  navIdent: z.string({ error: "Velg en saksbehandler" }).min(1, "Velg en saksbehandler"),
});

interface OverforAnsvarligModalProps {
  sakId: string;
  saksbehandlerDetaljer: KontrollsakSaksbehandler[];
  åpen: boolean;
  onClose: () => void;
}

export function OverforAnsvarligModal({
  sakId,
  saksbehandlerDetaljer,
  åpen,
  onClose,
}: OverforAnsvarligModalProps) {
  const fetcher = useFetcher();
  const saksreferanse = getSaksreferanse(sakId);

  const erSubmitting = fetcher.state !== "idle";
  const actionPath = RouteConfig.SAKER_DETALJ.replace(":sakId", saksreferanse);

  const [form, fields] = useForm({
    id: "overfor-ansvarlig",
    constraint: getZodConstraint(overforSkjema),
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: overforSkjema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    onSubmit(event, { formData }) {
      event.preventDefault();
      formData.set("handling", "overfor_ansvarlig");
      fetcher.submit(formData, { method: "post", action: actionPath });
      form.reset();
      onClose();
    },
  });

  function handleClose() {
    form.reset();
    onClose();
  }

  function handleFjernSaksbehandler() {
    fetcher.submit({ handling: "FRISTILL" }, { method: "post", action: actionPath });
    handleClose();
  }

  return (
    <Modal
      open={åpen}
      onClose={handleClose}
      header={{
        heading: "Endre ansvarlig saksbehandler",
        icon: <PersonPencilIcon aria-hidden />,
      }}
      width="small"
    >
      <fetcher.Form method="post" {...getFormProps(form)}>
        <Modal.Body>
          <VStack gap="space-4">
            <BodyShort>Velg ny ansvarlig saksbehandler for sak {saksreferanse}.</BodyShort>
            <Select
              key={fields.navIdent.key}
              name={fields.navIdent.name}
              id={fields.navIdent.id}
              defaultValue={fields.navIdent.initialValue ?? ""}
              label="Saksbehandler"
              error={fields.navIdent.errors?.[0]}
            >
              <option value="">Velg saksbehandler</option>
              {saksbehandlerDetaljer.map((saksbehandler) => (
                <option key={saksbehandler.navIdent} value={saksbehandler.navIdent}>
                  {`${saksbehandler.navn} (${saksbehandler.navIdent})`}
                </option>
              ))}
            </Select>
          </VStack>
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" disabled={erSubmitting}>
            Overfør sak
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleFjernSaksbehandler}
            disabled={erSubmitting}
          >
            Fjern saksbehandler
          </Button>
          <Button type="button" variant="secondary" onClick={handleClose}>
            Avbryt
          </Button>
        </Modal.Footer>
      </fetcher.Form>
    </Modal>
  );
}
