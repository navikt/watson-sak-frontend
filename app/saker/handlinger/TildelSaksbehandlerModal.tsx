import { getFormProps, useForm, useInputControl } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { PersonPencilIcon } from "@navikt/aksel-icons";
import { Alert, BodyShort, Button, Modal, UNSAFE_Combobox, VStack } from "@navikt/ds-react";
import { useFetcher } from "react-router";
import { z } from "zod";
import { sporHendelse } from "~/analytics/analytics";
import { Innsendingsfeil } from "~/feilhåndtering/Innsendingsfeil";
import { useModalInnsending } from "~/saker/handlinger/useModalInnsending";
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

  const innsending = useModalInnsending(fetcher, () => {
    form.reset();
    onClose();
  });
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
      innsending.markerSendt();
    },
  });
  const navIdentControl = useInputControl(fields.navIdent);

  function handleClose() {
    innsending.nullstillFeil();
    form.reset();
    onClose();
  }

  const valgbareSaksbehandlere =
    saksbehandlerDetaljer.length > 0
      ? saksbehandlerDetaljer.map((saksbehandler) => ({
          value: saksbehandler.navIdent,
          label: `${saksbehandler.navn} (${saksbehandler.navIdent})`,
        }))
      : saksbehandlere.map((saksbehandler) => ({
          value: saksbehandler,
          label: saksbehandler,
        }));
  const valgtSaksbehandler = valgbareSaksbehandlere.find(
    (saksbehandler) => saksbehandler.value === navIdentControl.value,
  );

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
            <input
              type="hidden"
              name={fields.navIdent.name}
              defaultValue={fields.navIdent.initialValue}
              hidden
              tabIndex={-1}
              onFocus={() => navIdentControl.focus()}
            />
            <UNSAFE_Combobox
              key={fields.navIdent.key}
              id={fields.navIdent.id}
              label="Saksbehandler"
              placeholder="Søk etter saksbehandler"
              options={valgbareSaksbehandlere}
              selectedOptions={valgtSaksbehandler ? [valgtSaksbehandler] : []}
              onToggleSelected={(navIdent, erValgt) => {
                navIdentControl.change(erValgt ? navIdent : "");
              }}
              error={fields.navIdent.errors?.[0]}
            />
            {innsending.feilmelding && <Alert variant="error">{innsending.feilmelding}</Alert>}
          </VStack>
        </Modal.Body>
        <Modal.Footer>
          <Innsendingsfeil svar={innsending.tekniskFeil} />
          <Button type="submit" disabled={erSubmitting || !navIdentControl.value}>
            Tildel
          </Button>
          <Button type="button" variant="secondary" onClick={handleClose}>
            Avbryt
          </Button>
        </Modal.Footer>
      </fetcher.Form>
    </Modal>
  );
}
