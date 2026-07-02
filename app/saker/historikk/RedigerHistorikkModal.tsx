import { getFormProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { PencilIcon } from "@navikt/aksel-icons";
import { Button, Modal } from "@navikt/ds-react";
import { useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import { NORSK_TIDSSONE } from "~/utils/date-utils";
import { historikkSkjema, HistorikkSkjemaFelter, parseDato } from "./historikk-skjema";
import type { SakHendelse } from "./typer";

function parseIsoTilLokalDatoOgTid(isoString: string): { dato: string; tid: string } {
  const date = new Date(isoString);
  const formatter = new Intl.DateTimeFormat("nb-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: NORSK_TIDSSONE,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    dato: `${get("day")}.${get("month")}.${get("year")}`,
    tid: `${get("hour")}:${get("minute")}`,
  };
}

interface RedigerHistorikkModalProps {
  sakId: number;
  hendelse: SakHendelse;
  åpen: boolean;
  onClose: () => void;
}

export function RedigerHistorikkModal({
  sakId,
  hendelse,
  åpen,
  onClose,
}: RedigerHistorikkModalProps) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const fetcher = useFetcher();

  const { dato: initialDato, tid: initialTid } = parseIsoTilLokalDatoOgTid(hendelse.tidspunkt);
  const initialDate = parseDato(initialDato) ?? new Date();

  const [form, fields] = useForm({
    id: `rediger-historikk-${hendelse.hendelseId}`,
    lastResult: fetcher.state === "idle" ? fetcher.data : null,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: historikkSkjema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    defaultValue: {
      tittel: hendelse.tittel ?? "",
      notat: hendelse.beskrivelse ?? "",
      dato: initialDato,
      tid: initialTid,
    },
    onSubmit(event, { formData }) {
      event.preventDefault();
      formData.set("handling", "rediger_historikk");
      formData.set("hendelseId", hendelse.hendelseId);
      fetcher.submit(formData, {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId)),
      });
      onClose();
    },
  });

  useEffect(() => {
    if (!åpen) return;
    form.reset();
  }, [åpen, hendelse.hendelseId]);

  return (
    <Modal
      ref={modalRef}
      open={åpen}
      onClose={onClose}
      header={{ heading: "Rediger historikkinnslag", icon: <PencilIcon aria-hidden /> }}
      width="medium"
    >
      <fetcher.Form method="post" {...getFormProps(form)}>
        <Modal.Body>
          <HistorikkSkjemaFelter
            fields={fields}
            defaultSelected={initialDate}
            onDatoChange={() => {}}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" variant="primary">
            Lagre endringer
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Avbryt
          </Button>
        </Modal.Footer>
      </fetcher.Form>
    </Modal>
  );
}
