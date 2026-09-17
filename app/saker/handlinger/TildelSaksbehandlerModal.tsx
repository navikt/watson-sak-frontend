import { getFormProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { PersonPencilIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, Modal, UNSAFE_Combobox, VStack } from "@navikt/ds-react";
import { useState } from "react";
import { useFetcher } from "react-router";
import { z } from "zod";
import { sporHendelse } from "~/analytics/analytics";
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
  const [valgtNavIdent, setValgtNavIdent] = useState("");

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
      sporHendelse("fordeling utført");
      fetcher.submit(formData, { method: "post", action: actionPath });
      form.reset();
      setValgtNavIdent("");
      onClose();
    },
  });

  function handleFjernSaksbehandler() {
    fetcher.submit({ handling: "FRISTILL", sakId }, { method: "post", action: actionPath });
    onClose();
  }

  function handleClose() {
    form.reset();
    setValgtNavIdent("");
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
            <input type="hidden" name={fields.navIdent.name} value={valgtNavIdent} />
            <UNSAFE_Combobox
              key={fields.navIdent.key}
              id={fields.navIdent.id}
              label="Saksbehandler"
              placeholder="Søk etter saksbehandler"
              options={valgbareSaksbehandlere.map((saksbehandler) => ({
                label: saksbehandler.etikett,
                value: saksbehandler.verdi,
              }))}
              selectedOptions={valgtNavIdent ? [valgtNavIdent] : []}
              onToggleSelected={(navIdent, erValgt) => {
                setValgtNavIdent(erValgt ? navIdent : "");
              }}
              error={fields.navIdent.errors?.[0]}
            />
          </VStack>
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" disabled={erSubmitting || !valgtNavIdent}>
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
