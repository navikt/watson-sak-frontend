import { getFormProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { PersonPencilIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Modal, Select, VStack } from "@navikt/ds-react";
import { useFetcher } from "react-router";
import { z } from "zod";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import type { KontrollsakSaksbehandler } from "~/saker/types.backend";

const tildelSkjema = z.object({
  navIdent: z.string({ error: "Velg en saksbehandler" }).min(1, "Velg en saksbehandler"),
});

interface TildelSaksbehandlerModalProps {
  sakId: string;
  saksbehandlere: string[];
  saksbehandlerDetaljer?: KontrollsakSaksbehandler[];
  nåværendeSaksbehandler?: KontrollsakSaksbehandler | null;
  submitPath?: string;
  åpen: boolean;
  onClose: () => void;
}

export function TildelSaksbehandlerModal({
  sakId,
  saksbehandlere,
  saksbehandlerDetaljer = [],
  nåværendeSaksbehandler,
  submitPath,
  åpen,
  onClose,
}: TildelSaksbehandlerModalProps) {
  const fetcher = useFetcher();
  const saksreferanse = getSaksreferanse(sakId);

  const erSubmitting = fetcher.state !== "idle";
  const actionPath =
    submitPath ?? RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId));

  const [form, fields] = useForm({
    id: "tildel-saksbehandler",
    constraint: getZodConstraint(tildelSkjema),
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: tildelSkjema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    onSubmit(event, { formData }) {
      event.preventDefault();
      formData.set("handling", "TILDEL");
      formData.set("sakId", sakId);
      fetcher.submit(formData, { method: "post", action: actionPath });
      form.reset();
      onClose();
    },
  });

  function handleFjernSaksbehandler() {
    fetcher.submit({ handling: "FRISTILL", sakId }, { method: "post", action: actionPath });
    onClose();
  }

  function handleClose() {
    form.reset();
    onClose();
  }

  const valgbareSaksbehandlere =
    saksbehandlerDetaljer.length > 0
      ? saksbehandlerDetaljer.map((saksbehandler) => ({
          verdi: saksbehandler.navIdent,
          etikett: `${saksbehandler.navn} (${saksbehandler.navIdent})`,
        }))
      : saksbehandlere.map((saksbehandler) => ({ verdi: saksbehandler, etikett: saksbehandler }));

  const heading = nåværendeSaksbehandler ? "Endre saksbehandler" : "Tildel saksbehandler";

  return (
    <Modal
      open={åpen}
      onClose={handleClose}
      header={{
        heading,
        icon: <PersonPencilIcon aria-hidden />,
      }}
      width="small"
    >
      <fetcher.Form method="post" {...getFormProps(form)}>
        <Modal.Body>
          <VStack gap="space-4">
            {nåværendeSaksbehandler && (
              <BodyShort>
                Nåværende saksbehandler:{" "}
                <strong>
                  {nåværendeSaksbehandler.navn} ({nåværendeSaksbehandler.navIdent})
                </strong>
              </BodyShort>
            )}
            <BodyShort>Velg saksbehandler som skal ha ansvar for sak {saksreferanse}.</BodyShort>
            <Select
              key={fields.navIdent.key}
              name={fields.navIdent.name}
              id={fields.navIdent.id}
              defaultValue={fields.navIdent.initialValue ?? ""}
              label="Saksbehandler"
              error={fields.navIdent.errors?.[0]}
            >
              <option value="">Velg saksbehandler</option>
              {valgbareSaksbehandlere.map((saksbehandler) => (
                <option key={saksbehandler.verdi} value={saksbehandler.verdi}>
                  {saksbehandler.etikett}
                </option>
              ))}
            </Select>
          </VStack>
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" disabled={erSubmitting}>
            Tildel
          </Button>
          <Button type="button" variant="secondary" onClick={handleClose}>
            Avbryt
          </Button>
          {nåværendeSaksbehandler && (
            <Button
              type="button"
              variant="tertiary-neutral"
              onClick={handleFjernSaksbehandler}
              disabled={erSubmitting}
              className="ml-auto"
            >
              Fjern saksbehandler
            </Button>
          )}
        </Modal.Footer>
      </fetcher.Form>
    </Modal>
  );
}
