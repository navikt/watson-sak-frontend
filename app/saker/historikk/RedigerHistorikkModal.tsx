import { getFormProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { PencilIcon } from "@navikt/aksel-icons";
import { Alert, Button, Modal } from "@navikt/ds-react";
import { useEffect, useRef, useState } from "react";
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

/**
 * NB: Denne komponenten skal kun monteres ÉN gang per side (eid av
 * `SakHistorikk`, som deler den med `VisAllHistorikkModal` via props).
 * Se tilsvarende merknad i `LeggTilHistorikkModal`.
 */
export function RedigerHistorikkModal({
  sakId,
  hendelse,
  åpen,
  onClose,
}: RedigerHistorikkModalProps) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const fetcher = useFetcher();
  const submitPågår = useRef(false);
  // Komponenten forblir montert selv når modalen er lukket (eies av
  // SakHistorikk), så fetcher.data fra en tidligere innsending kan fortsatt
  // ligge igjen neste gang modalen åpnes for en (evt. annen) hendelse uten at
  // noe nytt er sendt inn. visFeilmelding nullstilles derfor eksplisitt ved
  // åpning, og settes kun når en feil faktisk oppstår i DENNE visningen.
  const [visFeilmelding, setVisFeilmelding] = useState(false);
  const feilmelding =
    visFeilmelding && fetcher.data && "ok" in fetcher.data && !fetcher.data.ok
      ? fetcher.data.feil?.skjema?.[0]
      : undefined;

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
      submitPågår.current = true;
      fetcher.submit(formData, {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId)),
      });
    },
  });

  useEffect(() => {
    if (!åpen) return;
    form.reset();
    setVisFeilmelding(false);
  }, [åpen, hendelse.hendelseId]);

  // Lukk modalen kun når innsendingen faktisk lyktes, se tilsvarende
  // resonnement i LeggTilHistorikkModal.
  useEffect(() => {
    if (!submitPågår.current || fetcher.state !== "idle") return;
    submitPågår.current = false;
    if (fetcher.data && "ok" in fetcher.data && fetcher.data.ok) {
      onClose();
    } else {
      setVisFeilmelding(true);
    }
  }, [fetcher.data, fetcher.state]);

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
          {feilmelding && (
            <Alert variant="error" className="mb-4">
              {feilmelding}
            </Alert>
          )}
          <HistorikkSkjemaFelter
            fields={fields}
            defaultSelected={initialDate}
            onDatoChange={() => {}}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" variant="primary" loading={fetcher.state !== "idle"}>
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
