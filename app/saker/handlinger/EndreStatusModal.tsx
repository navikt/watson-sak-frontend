import { getFormProps, useForm, useInputControl } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import {
  CheckmarkCircleFillIcon,
  ExclamationmarkTriangleIcon,
  PencilIcon,
} from "@navikt/aksel-icons";
import {
  BodyShort,
  Button,
  HGrid,
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

function formaterArbeidsstatus(verdi: "AKTIV" | Blokkeringsarsak): string {
  return arbeidsstatusValg.find((valg) => valg.value === verdi)?.label ?? verdi;
}

function SammendragRad({ label, verdi }: { label: string; verdi: React.ReactNode }) {
  return (
    <>
      <BodyShort size="small" textColor="subtle">
        {label}
      </BodyShort>
      <BodyShort size="small">{verdi}</BodyShort>
    </>
  );
}

type Steg = "skjema" | "bekreft" | "suksess";

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
  const [steg, setSteg] = useState<Steg>("skjema");
  const [innsendingFormData, setInnsendingFormData] = useState<FormData | null>(null);
  const [feilmelding, setFeilmelding] = useState<string | null>(null);

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
      const arbeidsstatus = formData.get("blokkert") as string;
      if (nyStatus !== "AVSLUTTET") {
        formData.set("blokkert", arbeidsstatus);
      }
      if (nyStatus === "HENLAGT") {
        formData.set("henleggelsesarsak", valgtHenleggelsesarsak);
      }
      sporHendelse("endre status bekreftelse vist", {
        fraStatus: nåværendeStatus,
        tilStatus: nyStatus,
      });
      setFeilmelding(null);
      setInnsendingFormData(formData);
      setSteg("bekreft");
    },
  });

  const statusControl = useInputControl(fields.status);
  const blokkertControl = useInputControl(fields.blokkert);
  const beskrivelseControl = useInputControl(fields.beskrivelse);
  const [valgtHenleggelsesarsak, setValgtHenleggelsesarsak] = useState(
    nåværendeStatus === "HENLAGT" ? (nåværendeHenleggelsesarsak ?? "") : "",
  );
  const valgtStatus = (statusControl.value as KontrollsakStatus | undefined) ?? nåværendeStatus;
  const valgtBlokkering =
    (blokkertControl.value as "AKTIV" | Blokkeringsarsak | undefined) ??
    nåværendeBlokkering ??
    "AKTIV";
  const visHenleggelse = valgtStatus === "HENLAGT";
  const erAvsluttet = valgtStatus === "AVSLUTTET";

  const gammelStatusLabel = formaterStatus(nåværendeStatus);
  const nyStatusLabel = formaterStatus(valgtStatus);
  const statusEndret = valgtStatus !== nåværendeStatus;

  const gammelArbeidsstatus = nåværendeBlokkering ?? "AKTIV";
  const arbeidsstatusEndret = !erAvsluttet && valgtBlokkering !== gammelArbeidsstatus;

  const gammelHenleggelsesarsak = nåværendeStatus === "HENLAGT" ? nåværendeHenleggelsesarsak : null;
  const henleggelsesarsakEndret =
    visHenleggelse &&
    valgtHenleggelsesarsak !== "" &&
    valgtHenleggelsesarsak !== gammelHenleggelsesarsak;

  const beskrivelseVerdi = (beskrivelseControl.value ?? "").trim();

  function nullstill() {
    form.reset();
    setValgtHenleggelsesarsak("");
    setSteg("skjema");
    setInnsendingFormData(null);
    setFeilmelding(null);
  }

  function handleDismiss() {
    if (erSubmitting) return;
    if (steg !== "suksess") {
      sporHendelse("endre status dialog avbrutt");
    }
    nullstill();
    onClose();
  }

  function handleAvbrytBekreftelse() {
    sporHendelse("endre status avbrutt i bekreftelse");
    setSteg("skjema");
  }

  function handleBekreft() {
    if (!innsendingFormData) return;
    sporHendelse("endre status lagre klikket", {
      fraStatus: nåværendeStatus,
      tilStatus: valgtStatus,
    });
    submitPågår.current = true;
    fetcher.submit(innsendingFormData, {
      method: "post",
      action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId)),
    });
  }

  useEffect(() => {
    if (åpen && !forrigeÅpen.current) {
      sporHendelse("endre status dialog åpnet");
      statusControl.change(nåværendeStatus);
      blokkertControl.change(nåværendeBlokkering ?? "AKTIV");
      beskrivelseControl.change("");
      setValgtHenleggelsesarsak(
        nåværendeStatus === "HENLAGT" ? (nåværendeHenleggelsesarsak ?? "") : "",
      );
      setSteg("skjema");
      setInnsendingFormData(null);
      setFeilmelding(null);
    }
    forrigeÅpen.current = åpen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [åpen, nåværendeBlokkering, nåværendeHenleggelsesarsak, nåværendeStatus]);

  useEffect(() => {
    if (!submitPågår.current || fetcher.state !== "idle") {
      return;
    }

    if (fetcher.data && "ok" in fetcher.data && fetcher.data.ok) {
      sporHendelse("endre status lagret");
      setFeilmelding(null);
      setSteg("suksess");
    } else {
      sporHendelse("endre status lagring feilet");
      setFeilmelding("Kunne ikke endre status. Prøv igjen.");
      setSteg("bekreft");
    }
    submitPågår.current = false;
  }, [fetcher.data, fetcher.state]);

  return (
    <Modal
      open={åpen}
      onClose={handleDismiss}
      header={
        steg === "suksess"
          ? undefined
          : { heading: "Endre status", icon: <PencilIcon aria-hidden /> }
      }
      width={steg === "skjema" ? "medium" : "small"}
    >
      {steg === "suksess" && <Modal.Header />}
      <fetcher.Form method="post" {...getFormProps(form)}>
        <Modal.Body>
          {steg === "skjema" && (
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
                <hr className="border-ax-border-neutral-subtle" />
                <input
                  key={fields.blokkert.key}
                  name={fields.blokkert.name}
                  value={valgtBlokkering}
                  readOnly
                  hidden
                  tabIndex={-1}
                  onFocus={() => blokkertControl.focus()}
                />
                {!erAvsluttet ? (
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
                    <hr className="border-ax-border-neutral-subtle" />
                  </>
                ) : null}
              </VStack>
              <Textarea
                key={fields.beskrivelse.key}
                name={fields.beskrivelse.name}
                id={fields.beskrivelse.id}
                value={beskrivelseControl.value ?? ""}
                onChange={(event) => beskrivelseControl.change(event.target.value)}
                onBlur={beskrivelseControl.blur}
                label="Beskrivelse (valgfritt)"
                minRows={2}
                maxRows={5}
                error={fields.beskrivelse.errors?.[0]}
              />
            </VStack>
          )}

          {steg === "bekreft" && (
            <VStack gap="space-16">
              <BodyShort>Du endrer nå status på saken:</BodyShort>
              <div className="rounded-md bg-ax-bg-neutral-soft px-5 py-4">
                <HGrid columns="auto 1fr" gap="space-4 space-16">
                  <SammendragRad
                    label="Status"
                    verdi={
                      statusEndret
                        ? `Fra «${gammelStatusLabel}» til «${nyStatusLabel}»`
                        : `«${nyStatusLabel}» (uendret)`
                    }
                  />
                  {arbeidsstatusEndret && (
                    <SammendragRad
                      label="Arbeidsstatus"
                      verdi={`Fra «${formaterArbeidsstatus(gammelArbeidsstatus)}» til «${formaterArbeidsstatus(valgtBlokkering)}»`}
                    />
                  )}
                  {henleggelsesarsakEndret && (
                    <SammendragRad
                      label="Henleggelsesårsak"
                      verdi={formaterHenleggelsesarsak(valgtHenleggelsesarsak as Henleggelsesarsak)}
                    />
                  )}
                  {beskrivelseVerdi && (
                    <SammendragRad label="Beskrivelse" verdi={beskrivelseVerdi} />
                  )}
                </HGrid>
              </div>
              {erAvsluttet && (
                <InfoCard size="small" data-color="warning">
                  <InfoCard.Message icon={<ExclamationmarkTriangleIcon aria-hidden />}>
                    Avsluttet er en endelig status – du kan ikke endre tilbake
                  </InfoCard.Message>
                </InfoCard>
              )}
              {feilmelding && (
                <InfoCard size="small" data-color="danger">
                  <InfoCard.Message icon={<ExclamationmarkTriangleIcon aria-hidden />}>
                    {feilmelding}
                  </InfoCard.Message>
                </InfoCard>
              )}
            </VStack>
          )}

          {steg === "suksess" && (
            <VStack gap="space-16" align="center" className="py-6 text-center">
              <CheckmarkCircleFillIcon
                aria-hidden
                fontSize="3rem"
                className="text-ax-bg-success-strong"
              />
              <VStack gap="space-4" align="center">
                <BodyShort weight="semibold">Status endret</BodyShort>
                <BodyShort textColor="subtle">
                  {statusEndret
                    ? `Statusen på saken er endret til «${nyStatusLabel}».`
                    : "Saken er oppdatert."}
                </BodyShort>
              </VStack>
            </VStack>
          )}
        </Modal.Body>
        <Modal.Footer>
          {steg === "skjema" && (
            <>
              <Button
                type="submit"
                variant="primary"
                disabled={erSubmitting}
                loading={erSubmitting}
              >
                Lagre
              </Button>
              <Button variant="secondary" onClick={handleDismiss} disabled={erSubmitting}>
                Avbryt
              </Button>
            </>
          )}
          {steg === "bekreft" && (
            <>
              <Button variant="secondary" onClick={handleAvbrytBekreftelse} disabled={erSubmitting}>
                Avbryt
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleBekreft}
                loading={erSubmitting}
                disabled={erSubmitting}
              >
                Endre status
              </Button>
            </>
          )}
          {steg === "suksess" && (
            <Button variant="primary" onClick={handleDismiss}>
              Lukk
            </Button>
          )}
        </Modal.Footer>
      </fetcher.Form>
    </Modal>
  );
}
