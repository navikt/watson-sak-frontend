import { getFormProps, getTextareaProps, useForm, useInputControl } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { ExclamationmarkTriangleIcon, PencilIcon } from "@navikt/aksel-icons";
import { Button, InfoCard, Modal, Select, Textarea, VStack } from "@navikt/ds-react";
import { useFetcher } from "react-router";
import { z } from "zod";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import type { KontrollsakStatus } from "~/saker/types.backend";
import { formaterStatus } from "~/saker/visning";

interface EndreStatusModalProps {
  sakId: string;
  nåværendeStatus: KontrollsakStatus;
  åpen: boolean;
  onClose: () => void;
}

const valgbareStatuser: KontrollsakStatus[] = [
  "OPPRETTET",
  "UTREDES",
  "STRAFFERETTSLIG_VURDERING",
  "ANMELDT",
  "HENLAGT",
  "AVSLUTTET",
];

const endreStatusSkjema = z.object({
  status: z.string({ error: "Velg en status" }).min(1, "Velg en status"),
  beskrivelse: z.string().optional(),
});

export function EndreStatusModal({ sakId, nåværendeStatus, åpen, onClose }: EndreStatusModalProps) {
  const fetcher = useFetcher();
  const erSubmitting = fetcher.state !== "idle";

  const [form, fields] = useForm({
    id: "endre-status",
    lastResult: fetcher.state === "idle" ? fetcher.data : null,
    constraint: getZodConstraint(endreStatusSkjema),
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: endreStatusSkjema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    onSubmit(event, { formData }) {
      event.preventDefault();
      formData.set("handling", "endre_status");
      fetcher.submit(formData, {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId)),
      });
      form.reset();
      onClose();
    },
  });

  const status = useInputControl(fields.status);

  function handleLukk() {
    if (erSubmitting) return;
    form.reset();
    onClose();
  }

  return (
    <Modal
      open={åpen}
      onClose={handleLukk}
      header={{ heading: "Endre status", icon: <PencilIcon aria-hidden /> }}
      width="small"
    >
      <fetcher.Form method="post" {...getFormProps(form)}>
        <Modal.Body>
          <VStack gap="space-4">
            <VStack gap="space-8">
              <input
                name={fields.status.name}
                defaultValue={fields.status.initialValue}
                hidden
                tabIndex={-1}
                onFocus={() => status.focus()}
              />
              <Select
                label="Ny status"
                value={status.value ?? ""}
                onChange={(event) => status.change(event.target.value)}
                onBlur={status.blur}
                error={fields.status.errors?.[0]}
              >
                <option value="">Velg status</option>
                {valgbareStatuser.map((s) => (
                  <option key={s} value={s} disabled={s === nåværendeStatus}>
                    {formaterStatus(s)}
                  </option>
                ))}
              </Select>
              {status.value === "AVSLUTTET" ? (
                <InfoCard size="small" data-color="warning">
                  <InfoCard.Message icon={<ExclamationmarkTriangleIcon aria-hidden />}>
                    Avsluttet er en endelig status – du kan ikke endre tilbake
                  </InfoCard.Message>
                </InfoCard>
              ) : null}
            </VStack>
            <Textarea
              {...getTextareaProps(fields.beskrivelse)}
              label="Beskrivelse (valgfritt)"
              minRows={2}
              maxRows={5}
              error={fields.beskrivelse.errors?.[0]}
            />
          </VStack>
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" variant="primary" disabled={erSubmitting} loading={erSubmitting}>
            Lagre
          </Button>
          <Button variant="secondary" onClick={handleLukk} disabled={erSubmitting}>
            Avbryt
          </Button>
        </Modal.Footer>
      </fetcher.Form>
    </Modal>
  );
}
