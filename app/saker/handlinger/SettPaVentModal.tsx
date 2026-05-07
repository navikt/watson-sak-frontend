import { getFormProps, getTextareaProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { ClockDashedIcon } from "@navikt/aksel-icons";
import { Button, Modal, Radio, RadioGroup, Textarea, VStack } from "@navikt/ds-react";
import { useState } from "react";
import { useFetcher } from "react-router";
import { z } from "zod";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import type { Blokkeringsarsak } from "~/saker/types.backend";
import { formaterBlokkeringsarsak } from "~/saker/visning";

interface SettPaVentModalProps {
  sakId: string;
  åpen: boolean;
  onClose: () => void;
}

const blokkeringsårsaker: Blokkeringsarsak[] = [
  "VENTER_PA_INFORMASJON",
  "VENTER_PA_VEDTAK",
  "I_BERO",
];

const settPaVentSkjema = z.object({
  blokkert: z.string({ error: "Velg en årsak" }).min(1, "Velg en årsak"),
  beskrivelse: z.string().optional(),
});

export function SettPaVentModal({ sakId, åpen, onClose }: SettPaVentModalProps) {
  const fetcher = useFetcher();
  const [valgtÅrsak, setValgtÅrsak] = useState("");
  const erSubmitting = fetcher.state !== "idle";

  const [form, fields] = useForm({
    id: "sett-pa-vent",
    lastResult: fetcher.state === "idle" ? fetcher.data : null,
    constraint: getZodConstraint(settPaVentSkjema),
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: settPaVentSkjema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    onSubmit(event, { formData }) {
      event.preventDefault();
      formData.set("handling", "endre_blokkering");
      fetcher.submit(formData, {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId)),
      });
      setValgtÅrsak("");
      form.reset();
      onClose();
    },
  });

  function handleLukk() {
    if (erSubmitting) return;
    setValgtÅrsak("");
    form.reset();
    onClose();
  }

  return (
    <Modal
      open={åpen}
      onClose={handleLukk}
      header={{ heading: "Sett på vent", icon: <ClockDashedIcon aria-hidden /> }}
      width="small"
    >
      <fetcher.Form method="post" {...getFormProps(form)}>
        <Modal.Body>
          <VStack gap="space-4">
            <input type="hidden" name={fields.blokkert.name} value={valgtÅrsak} />
            <RadioGroup
              legend="Årsak til venting"
              value={valgtÅrsak}
              onChange={setValgtÅrsak}
              error={fields.blokkert.errors?.[0]}
            >
              {blokkeringsårsaker.map((årsak) => (
                <Radio key={årsak} value={årsak}>
                  {formaterBlokkeringsarsak(årsak)}
                </Radio>
              ))}
            </RadioGroup>
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
