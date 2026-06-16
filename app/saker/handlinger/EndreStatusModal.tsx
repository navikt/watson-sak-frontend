import { getFormProps, getTextareaProps, useForm, useInputControl } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { ExclamationmarkTriangleIcon, PencilIcon } from "@navikt/aksel-icons";
import {
  Button,
  InfoCard,
  Modal,
  Radio,
  RadioGroup,
  Select,
  Textarea,
  VStack,
} from "@navikt/ds-react";
import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { z } from "zod";
import { sporHendelse } from "~/analytics/analytics";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import type { Blokkeringsarsak, Henleggelsesarsak, KontrollsakStatus } from "~/saker/types.backend";
import { henleggelsesarsakSchema } from "~/saker/types.backend";
import {
  formaterBlokkeringsarsak,
  formaterHenleggelsesarsak,
  formaterStatus,
  henleggelsesarsakAlternativer,
} from "~/saker/visning";

interface EndreStatusModalProps {
  sakId: string;
  nåværendeStatus: KontrollsakStatus;
  nåværendeBlokkering: Blokkeringsarsak | null;
  nåværendeHenleggelsesarsak: Henleggelsesarsak | null;
  åpen: boolean;
  onClose: () => void;
}

const valgbareStatuser: KontrollsakStatus[] = [
  "OPPRETTET",
  "UTREDES",
  "STRAFFERETTSLIG_VURDERING",
  "ANMELDT",
  "HENLAGT",
  "AVSLUTTET",
];

const endreStatusSkjema = z
  .object({
    status: z.string({ error: "Velg en status" }).min(1, "Velg en status"),
    blokkert: z.string({ error: "Velg arbeidsstatus" }).min(1, "Velg arbeidsstatus"),
    henleggelsesarsak: z.preprocess(
      (val) => (val === "" ? undefined : val),
      henleggelsesarsakSchema.optional(),
    ),
    beskrivelse: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "HENLAGT" && data.henleggelsesarsak === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["henleggelsesarsak"],
        message: "Du må velge henleggelsesårsak.",
      });
    }
  });

const arbeidsstatusValg: Array<{ value: "AKTIV" | Blokkeringsarsak; label: string }> = [
  { value: "AKTIV", label: "Aktiv" },
  { value: "VENTER_PA_VEDTAK", label: formaterBlokkeringsarsak("VENTER_PA_VEDTAK") },
  {
    value: "VENTER_PA_INFORMASJON",
    label: formaterBlokkeringsarsak("VENTER_PA_INFORMASJON"),
  },
  { value: "I_BERO", label: formaterBlokkeringsarsak("I_BERO") },
];

export function EndreStatusModal({
  sakId,
  nåværendeStatus,
  nåværendeBlokkering,
  nåværendeHenleggelsesarsak,
  åpen,
  onClose,
}: EndreStatusModalProps) {
  const fetcher = useFetcher();
  const erSubmitting = fetcher.state !== "idle";
  const submitPågår = useRef(false);
  const forrigeÅpen = useRef(false);

  const [form, fields] = useForm({
    id: "endre-status",
    lastResult: fetcher.state === "idle" ? fetcher.data : null,
    constraint: getZodConstraint(endreStatusSkjema),
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: endreStatusSkjema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    onSubmit(event, { formData }) {
      event.preventDefault();
      formData.set("handling", "endre_status_dialog");
      const nyStatus = formData.get("status") as string;
      sporHendelse("endre status lagre klikket", {
        fraStatus: nåværendeStatus,
        tilStatus: nyStatus,
      });
      const arbeidsstatus = formData.get("blokkert") as string;
      if (nyStatus !== "AVSLUTTET") {
        formData.set("blokkert", arbeidsstatus);
      }
      submitPågår.current = true;
      fetcher.submit(formData, {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId)),
      });
      form.reset();
      onClose();
    },
  });

  const statusControl = useInputControl(fields.status);
  const blokkertControl = useInputControl(fields.blokkert);
  const [valgtHenleggelsesarsak, setValgtHenleggelsesarsak] = useState(
    nåværendeStatus === "HENLAGT" ? (nåværendeHenleggelsesarsak ?? "") : "",
  );
  const valgtStatus = (statusControl.value as KontrollsakStatus | undefined) ?? nåværendeStatus;
  const valgtBlokkering =
    (blokkertControl.value as "AKTIV" | Blokkeringsarsak | undefined) ??
    nåværendeBlokkering ??
    "AKTIV";
  const visHenleggelse = valgtStatus === "HENLAGT";
  const visAvsluttetAdvarsel = valgtStatus === "AVSLUTTET";

  function handleLukk() {
    if (erSubmitting) return;
    sporHendelse("endre status dialog avbrutt");
    form.reset();
    setValgtHenleggelsesarsak("");
    onClose();
  }

  useEffect(() => {
    if (åpen && !forrigeÅpen.current) {
      sporHendelse("endre status dialog åpnet");
      statusControl.change(nåværendeStatus);
      blokkertControl.change(nåværendeBlokkering ?? "AKTIV");
      setValgtHenleggelsesarsak(
        nåværendeStatus === "HENLAGT" ? (nåværendeHenleggelsesarsak ?? "") : "",
      );
    }
    forrigeÅpen.current = åpen;
  }, [
    åpen,
    nåværendeBlokkering,
    nåværendeHenleggelsesarsak,
    nåværendeStatus,
    blokkertControl,
    statusControl,
  ]);

  useEffect(() => {
    if (!submitPågår.current || fetcher.state !== "idle") {
      return;
    }

    if (fetcher.data && "ok" in fetcher.data && fetcher.data.ok) {
      sporHendelse("endre status lagret");
    } else {
      sporHendelse("endre status lagring feilet");
    }
    submitPågår.current = false;
  }, [fetcher.data, fetcher.state]);

  return (
    <Modal
      open={åpen}
      onClose={handleLukk}
      header={{ heading: "Endre status", icon: <PencilIcon aria-hidden /> }}
      width="small"
    >
      <fetcher.Form method="post" {...getFormProps(form)}>
        <Modal.Body>
          <VStack gap="space-4">
            <VStack gap="space-8">
              <input
                key={fields.status.key}
                name={fields.status.name}
                value={valgtStatus}
                readOnly
                hidden
                tabIndex={-1}
                onFocus={() => statusControl.focus()}
              />
              <RadioGroup
                legend="Saksstatus"
                value={valgtStatus}
                onChange={(value) => {
                  statusControl.change(value);
                  sporHendelse("endre status saksstatus valgt", { status: value });
                  if (value !== "HENLAGT") {
                    setValgtHenleggelsesarsak("");
                  }
                }}
                onBlur={statusControl.blur}
                error={fields.status.errors?.[0]}
              >
                {valgbareStatuser.map((s) => (
                  <Radio key={s} value={s}>
                    {formaterStatus(s)}
                  </Radio>
                ))}
              </RadioGroup>
              {visHenleggelse ? (
                <Select
                  key={fields.henleggelsesarsak.key}
                  name={fields.henleggelsesarsak.name}
                  id={fields.henleggelsesarsak.id}
                  value={valgtHenleggelsesarsak}
                  label="Henleggelsesårsak"
                  onChange={(event) => {
                    setValgtHenleggelsesarsak(event.target.value);
                    sporHendelse("endre status henleggelsesårsak valgt", {
                      henleggelsesarsak: event.target.value,
                    });
                  }}
                  error={fields.henleggelsesarsak.errors?.[0]}
                >
                  <option value="">Velg årsak</option>
                  {henleggelsesarsakAlternativer.map((arsak) => (
                    <option key={arsak} value={arsak}>
                      {formaterHenleggelsesarsak(arsak)}
                    </option>
                  ))}
                </Select>
              ) : null}
              {visAvsluttetAdvarsel ? (
                <InfoCard size="small" data-color="warning">
                  <InfoCard.Message icon={<ExclamationmarkTriangleIcon aria-hidden />}>
                    Avsluttet er en endelig status – du kan ikke endre tilbake
                  </InfoCard.Message>
                </InfoCard>
              ) : null}
              <input
                key={fields.blokkert.key}
                name={fields.blokkert.name}
                value={valgtBlokkering}
                readOnly
                hidden
                tabIndex={-1}
                onFocus={() => blokkertControl.focus()}
              />
              {!visAvsluttetAdvarsel ? (
                <>
                  <RadioGroup
                    legend="Arbeidsstatus"
                    value={valgtBlokkering}
                    onChange={(value) => {
                      blokkertControl.change(value);
                      sporHendelse("endre status arbeidsstatus valgt", { arbeidsstatus: value });
                    }}
                    onBlur={blokkertControl.blur}
                    error={fields.blokkert.errors?.[0]}
                  >
                    {arbeidsstatusValg.map((valg) => (
                      <Radio key={valg.value} value={valg.value}>
                        {valg.label}
                      </Radio>
                    ))}
                  </RadioGroup>
                </>
              ) : null}
            </VStack>
            <Textarea
              {...getTextareaProps(fields.beskrivelse)}
              label="Beskrivelse (valgfritt)"
              minRows={2}
              maxRows={5}
              error={fields.beskrivelse.errors?.[0]}
            />
          </VStack>
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" variant="primary" disabled={erSubmitting} loading={erSubmitting}>
            Lagre
          </Button>
          <Button variant="secondary" onClick={handleLukk} disabled={erSubmitting}>
            Avbryt
          </Button>
        </Modal.Footer>
      </fetcher.Form>
    </Modal>
  );
}
