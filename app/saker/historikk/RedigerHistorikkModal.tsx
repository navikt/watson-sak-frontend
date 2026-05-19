import {
  getFormProps,
  getInputProps,
  getTextareaProps,
  useForm,
  useInputControl,
} from "@conform-to/react";
import { parseWithZod } from "@conform-to/zod/v4";
import { PencilIcon } from "@navikt/aksel-icons";
import {
  Button,
  DatePicker,
  ErrorMessage,
  HStack,
  Modal,
  Textarea,
  TextField,
  useDatepicker,
  VStack,
} from "@navikt/ds-react";
import { useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import { z } from "zod";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import { NORSK_TIDSSONE } from "~/utils/date-utils";
import type { SakHendelse } from "./typer";

function parseDato(dato: string): Date | null {
  const deler = dato.split(".");
  if (deler.length !== 3) return null;
  const [dag, måned, år] = deler.map(Number);
  const d = new Date(år, måned - 1, dag);
  return Number.isNaN(d.getTime()) ? null : d;
}

const redigerHistorikkSkjema = z
  .object({
    tittel: z.string({ error: "Tittel er påkrevd" }).min(1, "Tittel er påkrevd"),
    notat: z.string().max(500, "Maks 500 tegn").optional(),
    dato: z.string({ error: "Dato er påkrevd" }).min(1, "Dato er påkrevd"),
    tid: z.string({ error: "Klokkeslett er påkrevd" }).min(1, "Klokkeslett er påkrevd"),
  })
  .refine(
    ({ dato, tid }) => {
      const d = parseDato(dato);
      if (!d) return true;
      const [timer, minutter] = tid.split(":").map(Number);
      d.setHours(timer, minutter, 0, 0);
      return d <= new Date();
    },
    { message: "Tidspunktet kan ikke være i fremtiden", path: ["tid"] },
  );

interface RedigerHistorikkModalProps {
  sakId: number;
  hendelse: SakHendelse;
  åpen: boolean;
  onClose: () => void;
}

function formaterDato(date: Date): string {
  const dag = String(date.getDate()).padStart(2, "0");
  const måned = String(date.getMonth() + 1).padStart(2, "0");
  const år = date.getFullYear();
  return `${dag}.${måned}.${år}`;
}

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

export function RedigerHistorikkModal({
  sakId,
  hendelse,
  åpen,
  onClose,
}: RedigerHistorikkModalProps) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const fetcher = useFetcher();

  const { dato: initialDato, tid: initialTid } = parseIsoTilLokalDatoOgTid(hendelse.tidspunkt);
  const initialDate = parseDato(initialDato);

  const { datepickerProps, inputProps, setSelected } = useDatepicker({
    defaultSelected: initialDate ?? new Date(),
    toDate: new Date(),
    onDateChange: (val) => {
      if (!val) return;
      dato.change(formaterDato(val));
    },
  });

  const [form, fields] = useForm({
    id: `rediger-historikk-${hendelse.hendelseId}`,
    lastResult: fetcher.state === "idle" ? fetcher.data : null,
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: redigerHistorikkSkjema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    defaultValue: {
      tittel: hendelse.tittel ?? "",
      notat: hendelse.notat ?? "",
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

  const dato = useInputControl(fields.dato);

  useEffect(() => {
    if (!åpen) return;
    const { dato: d } = parseIsoTilLokalDatoOgTid(hendelse.tidspunkt);
    const parsedDate = parseDato(d);
    if (parsedDate) setSelected(parsedDate);
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
          <VStack gap="space-4">
            <TextField
              {...getInputProps(fields.tittel, { type: "text" })}
              label="Tittel"
              autoComplete="off"
              error={fields.tittel.errors?.[0]}
            />
            <Textarea
              {...getTextareaProps(fields.notat)}
              label="Beskrivelse"
              maxLength={500}
              error={fields.notat.errors?.[0]}
            />
            <input
              name={fields.dato.name}
              defaultValue={fields.dato.initialValue}
              hidden
              tabIndex={-1}
              onFocus={() => dato.focus()}
            />
            <fieldset>
              <DatePicker {...datepickerProps}>
                <HStack gap="space-4" align="end">
                  <DatePicker.Input
                    {...inputProps}
                    label="Dato"
                    value={dato.value ?? ""}
                    onChange={(e) => {
                      inputProps.onChange?.(e);
                      dato.change(e.target.value);
                    }}
                  />
                  <TextField {...getInputProps(fields.tid, { type: "time" })} label="Klokkeslett" />
                </HStack>
              </DatePicker>
              {(fields.dato.errors?.[0] || fields.tid.errors?.[0]) && (
                <ErrorMessage size="small" className="mt-1">
                  {fields.dato.errors?.[0] || fields.tid.errors?.[0]}
                </ErrorMessage>
              )}
            </fieldset>
          </VStack>
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
