import {
  getFormProps,
  getInputProps,
  getTextareaProps,
  useForm,
  useInputControl,
} from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { PlusIcon } from "@navikt/aksel-icons";
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

function parseDato(dato: string): Date | null {
  const deler = dato.split(".");
  if (deler.length !== 3) return null;
  const [dag, måned, år] = deler.map(Number);
  const d = new Date(år, måned - 1, dag);
  return Number.isNaN(d.getTime()) ? null : d;
}

const leggTilHistorikkSkjema = z
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

interface LeggTilHistorikkModalProps {
  sakId: string;
  åpen: boolean;
  onClose: () => void;
}

function formaterDato(nå: Date): string {
  const dag = String(nå.getDate()).padStart(2, "0");
  const måned = String(nå.getMonth() + 1).padStart(2, "0");
  const år = nå.getFullYear();
  return `${dag}.${måned}.${år}`;
}

function formaterTid(nå: Date): string {
  return `${String(nå.getHours()).padStart(2, "0")}:${String(nå.getMinutes()).padStart(2, "0")}`;
}

export function LeggTilHistorikkModal({ sakId, åpen, onClose }: LeggTilHistorikkModalProps) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const fetcher = useFetcher();

  const { datepickerProps, inputProps, setSelected } = useDatepicker({
    defaultSelected: new Date(),
    toDate: new Date(),
    onDateChange: (val) => {
      if (!val) return;
      dato.change(formaterDato(val));
    },
  });

  const [form, fields] = useForm({
    id: "legg-til-historikk",
    lastResult: fetcher.state === "idle" ? fetcher.data : null,
    constraint: getZodConstraint(leggTilHistorikkSkjema),
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: leggTilHistorikkSkjema });
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
      setSelected(new Date());
      onClose();
    },
  });

  const dato = useInputControl(fields.dato);

  useEffect(() => {
    if (!åpen) return;
    const nå = new Date();
    setSelected(nå);
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
              {fields.tid.errors?.[0] && (
                <ErrorMessage size="small" className="mt-1">
                  {fields.tid.errors[0]}
                </ErrorMessage>
              )}
            </fieldset>
          </VStack>
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
