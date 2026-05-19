import { getFormProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { PlusIcon } from "@navikt/aksel-icons";
import { Button, Modal } from "@navikt/ds-react";
import { useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import {
  formaterDato,
  formaterTid,
  historikkSkjema,
  HistorikkSkjemaFelter,
} from "./historikk-skjema";

interface LeggTilHistorikkModalProps {
  sakId: number;
  åpen: boolean;
  onClose: () => void;
}

export function LeggTilHistorikkModal({ sakId, åpen, onClose }: LeggTilHistorikkModalProps) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const fetcher = useFetcher();

  const [form, fields] = useForm({
    id: "legg-til-historikk",
    lastResult: fetcher.state === "idle" ? fetcher.data : null,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: historikkSkjema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    defaultValue: {
      dato: formaterDato(new Date()),
      tid: formaterTid(new Date()),
    },
    onSubmit(event, { formData }) {
      event.preventDefault();
      formData.set("handling", "legg_til_historikk");
      fetcher.submit(formData, {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId)),
      });
      form.reset();
      onClose();
    },
  });

  useEffect(() => {
    if (!åpen) return;
    form.reset();
  }, [åpen]);

  return (
    <Modal
      ref={modalRef}
      open={åpen}
      onClose={onClose}
      header={{ heading: "Legg til historikkinnslag", icon: <PlusIcon aria-hidden /> }}
      width="medium"
    >
      <fetcher.Form method="post" {...getFormProps(form)}>
        <Modal.Body>
          <HistorikkSkjemaFelter
            fields={fields}
            defaultSelected={new Date()}
            onDatoChange={() => {}}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" variant="primary">
            Lagre
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Avbryt
          </Button>
        </Modal.Footer>
      </fetcher.Form>
    </Modal>
  );
}
