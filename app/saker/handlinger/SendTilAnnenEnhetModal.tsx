import { getFormProps, useForm, useInputControl } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { ArrowForwardIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Modal, Select, VStack } from "@navikt/ds-react";
import { useEffect } from "react";
import { useFetcher, useNavigate } from "react-router";
import { z } from "zod";
import { enhetAlternativer, enhetEtiketter } from "~/registrer-sak/validering";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";

interface SendTilAnnenEnhetModalProps {
  sakId: string;
  nåværendeEnhet: string;
  åpen: boolean;
  onClose: () => void;
}

const sendTilAnnenEnhetSkjema = z.object({
  seksjon: z.string({ error: "Velg en enhet" }).min(1, "Velg en enhet"),
});

export function SendTilAnnenEnhetModal({
  sakId,
  nåværendeEnhet,
  åpen,
  onClose,
}: SendTilAnnenEnhetModalProps) {
  const fetcher = useFetcher<{ ok: boolean }>();
  const navigate = useNavigate();
  const saksreferanse = getSaksreferanse(sakId);
  const erSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      void navigate(RouteConfig.INDEX);
    }
  }, [fetcher.data, fetcher.state, navigate]);

  const [form, fields] = useForm({
    id: "send-til-annen-enhet",
    constraint: getZodConstraint(sendTilAnnenEnhetSkjema),
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: sendTilAnnenEnhetSkjema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    onSubmit(event, { formData }) {
      event.preventDefault();
      formData.set("handling", "send_til_annen_enhet");
      fetcher.submit(formData, {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", saksreferanse),
      });
      form.reset();
      onClose();
    },
  });

  const seksjon = useInputControl(fields.seksjon);

  function handleClose() {
    form.reset();
    onClose();
  }

  return (
    <Modal
      open={åpen}
      onClose={handleClose}
      header={{ heading: "Send til annen enhet", icon: <ArrowForwardIcon aria-hidden /> }}
      width="small"
    >
      <fetcher.Form method="post" {...getFormProps(form)}>
        <Modal.Body>
          <VStack gap="space-4">
            <BodyShort>
              Velg enhet saken skal sendes til. Ansvarlig saksbehandler fristilles fra saken.
            </BodyShort>
            <input
              name={fields.seksjon.name}
              defaultValue={fields.seksjon.initialValue}
              hidden
              tabIndex={-1}
              onFocus={() => seksjon.focus()}
            />
            <Select
              label="Ny enhet"
              value={seksjon.value ?? ""}
              onChange={(event) => seksjon.change(event.target.value)}
              onBlur={seksjon.blur}
              error={fields.seksjon.errors?.[0]}
            >
              <option value="">Velg enhet</option>
              {enhetAlternativer.map((enhet) => (
                <option key={enhet} value={enhet} disabled={enhet === nåværendeEnhet}>
                  {enhetEtiketter[enhet]}
                </option>
              ))}
            </Select>
          </VStack>
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" disabled={erSubmitting}>
            Send til annen enhet
          </Button>
          <Button variant="secondary" onClick={handleClose}>
            Avbryt
          </Button>
        </Modal.Footer>
      </fetcher.Form>
    </Modal>
  );
}
