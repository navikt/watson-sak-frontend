import { getFormProps, useForm } from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { PlusIcon } from "@navikt/aksel-icons";
import { Alert, Button, Modal } from "@navikt/ds-react";
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

/**
 * NB: Denne komponenten skal kun monteres ÉN gang per side (eid av
 * `SakHistorikk`, som deler den med `VisAllHistorikkModal` via props).
 * Den eksplisitte `useForm`-id-en under er trygg nettopp fordi det ikke
 * lenger finnes flere samtidige instanser — se historikken til denne filen
 * for en tidligere bug der to instanser med samme hardkodede id kolliderte.
 */
export function LeggTilHistorikkModal({ sakId, åpen, onClose }: LeggTilHistorikkModalProps) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const fetcher = useFetcher();
  const submitPågår = useRef(false);
  const feilmelding =
    fetcher.state === "idle" && fetcher.data && "ok" in fetcher.data && !fetcher.data.ok
      ? fetcher.data.feil?.skjema?.[0]
      : undefined;

  const [form, fields] = useForm({
    id: `legg-til-historikk-${sakId}`,
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
  }, [åpen]);

  // Lukk modalen kun når innsendingen faktisk lyktes — ikke optimistisk ved
  // klikk på "Lagre". Ved feil (f.eks. 409 fordi hendelsen nylig ble
  // opprettet og fortsatt ligger i BigQuerys streaming buffer) skal modalen
  // forbli åpen og vise feilmeldingen, i stedet for å late som om alt gikk
  // bra eller kræsje til en generisk feilside.
  useEffect(() => {
    if (!submitPågår.current || fetcher.state !== "idle") return;
    submitPågår.current = false;
    if (fetcher.data && "ok" in fetcher.data && fetcher.data.ok) {
      form.reset();
      onClose();
    }
  }, [fetcher.data, fetcher.state]);

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
          {feilmelding && (
            <Alert variant="error" className="mb-4">
              {feilmelding}
            </Alert>
          )}
          <HistorikkSkjemaFelter
            fields={fields}
            defaultSelected={new Date()}
            onDatoChange={() => {}}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" variant="primary" loading={fetcher.state !== "idle"}>
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
