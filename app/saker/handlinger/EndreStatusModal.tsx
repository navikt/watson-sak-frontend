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
import type { Henleggelsesarsak, KontrollsakStatus, KontrollsakSteg } from "~/saker/types.backend";
import { henleggelsesarsakSchema } from "~/saker/types.backend";
import {
  formaterHenleggelsesarsak,
  formaterStatus,
  formaterSteg,
  henleggelsesarsakAlternativer,
} from "~/saker/visning";

interface EndreStatusModalProps {
  sakId: string;
  nåværendeSteg: KontrollsakSteg;
  nåværendeStatus: KontrollsakStatus | null;
  nåværendeHenleggelsesarsak: Henleggelsesarsak | null;
  åpen: boolean;
  onClose: () => void;
}

const valgbareSteg: KontrollsakSteg[] = [
  "OPPRETTET",
  "UTREDES",
  "STRAFFERETTSLIG_VURDERING",
  "ANMELDT",
  "HENLAGT",
  "AVSLUTTET",
];

const endreStatusSkjema = z
  .object({
    steg: z.string({ error: "Velg et steg" }).min(1, "Velg et steg"),
    status: z.string({ error: "Velg status" }).min(1, "Velg status"),
    henleggelsesarsak: z.preprocess(
      (val) => (val === "" ? undefined : val),
      henleggelsesarsakSchema.optional(),
    ),
    beskrivelse: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.steg === "HENLAGT" && data.henleggelsesarsak === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["henleggelsesarsak"],
        message: "Du må velge henleggelsesårsak.",
      });
    }
  });

const statusValg: Array<{ value: "AKTIV" | KontrollsakStatus; label: string }> = [
  { value: "AKTIV", label: "Aktiv" },
  { value: "VENTER_PA_VEDTAK", label: formaterStatus("VENTER_PA_VEDTAK") },
  {
    value: "VENTER_PA_INFORMASJON",
    label: formaterStatus("VENTER_PA_INFORMASJON"),
  },
  { value: "I_BERO", label: formaterStatus("I_BERO") },
];

function formaterValgtStatus(verdi: "AKTIV" | KontrollsakStatus): string {
  return statusValg.find((valg) => valg.value === verdi)?.label ?? verdi;
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

type BekreftetResultat = {
  steg: KontrollsakSteg;
  stegEndret: boolean;
  status: "AKTIV" | KontrollsakStatus;
  statusEndret: boolean;
};

function byggSuksessmelding(sakId: string, resultat: BekreftetResultat | null): string {
  const saksreferanse = getSaksreferanse(sakId);
  if (!resultat) {
    return `Saken #${saksreferanse} er oppdatert.`;
  }

  const { steg, stegEndret, status, statusEndret } = resultat;

  if (stegEndret && statusEndret) {
    return `Steget på sak #${saksreferanse} er satt til ${formaterSteg(steg)}, og statusen er satt til ${formaterValgtStatus(status).toLowerCase()}.`;
  }
  if (stegEndret) {
    return `Steget på sak #${saksreferanse} er satt til ${formaterSteg(steg)}.`;
  }
  if (statusEndret) {
    return `Statusen på sak #${saksreferanse} er satt til ${formaterValgtStatus(status).toLowerCase()}.`;
  }
  return `Saken #${saksreferanse} er oppdatert.`;
}

type ModalFase = "skjema" | "bekreft" | "suksess";

export function EndreStatusModal({
  sakId,
  nåværendeSteg,
  nåværendeStatus,
  nåværendeHenleggelsesarsak,
  åpen,
  onClose,
}: EndreStatusModalProps) {
  const fetcher = useFetcher();
  const erSubmitting = fetcher.state !== "idle";
  const submitPågår = useRef(false);
  const forrigeÅpen = useRef(false);
  const [fase, setFase] = useState<ModalFase>("skjema");
  const [innsendingFormData, setInnsendingFormData] = useState<FormData | null>(null);
  const [feilmelding, setFeilmelding] = useState<string | null>(null);
  const [bekreftetResultat, setBekreftetResultat] = useState<BekreftetResultat | null>(null);

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
      formData.set("handling", "endre_steg_dialog");
      const nyttSteg = formData.get("steg") as string;
      const status = formData.get("status") as string;
      if (nyttSteg !== "AVSLUTTET") {
        formData.set("status", status);
      }
      if (nyttSteg === "HENLAGT") {
        formData.set("henleggelsesarsak", valgtHenleggelsesarsak);
      }
      const beskrivelse = (formData.get("beskrivelse") as string | null) ?? "";
      formData.set("beskrivelse", beskrivelse.trim());
      sporHendelse("endre status bekreftelse vist", {
        fraSteg: nåværendeSteg,
        tilSteg: nyttSteg,
      });
      setFeilmelding(null);
      setInnsendingFormData(formData);
      setFase("bekreft");
    },
  });

  const stegControl = useInputControl(fields.steg);
  const statusControl = useInputControl(fields.status);
  const beskrivelseControl = useInputControl(fields.beskrivelse);
  const [valgtHenleggelsesarsak, setValgtHenleggelsesarsak] = useState(
    nåværendeSteg === "HENLAGT" ? (nåværendeHenleggelsesarsak ?? "") : "",
  );
  const valgtSteg = (stegControl.value as KontrollsakSteg | undefined) ?? nåværendeSteg;
  const valgtStatus =
    (statusControl.value as "AKTIV" | KontrollsakStatus | undefined) ?? nåværendeStatus ?? "AKTIV";
  const visHenleggelse = valgtSteg === "HENLAGT";
  const erAvsluttet = valgtSteg === "AVSLUTTET";

  const gammelStegLabel = formaterSteg(nåværendeSteg);
  const nyttStegLabel = formaterSteg(valgtSteg);
  const stegEndret = valgtSteg !== nåværendeSteg;

  const gammelStatus = nåværendeStatus ?? "AKTIV";
  const statusEndret = !erAvsluttet && valgtStatus !== gammelStatus;

  const gammelHenleggelsesarsak = nåværendeSteg === "HENLAGT" ? nåværendeHenleggelsesarsak : null;
  const henleggelsesarsakEndret =
    visHenleggelse &&
    valgtHenleggelsesarsak !== "" &&
    valgtHenleggelsesarsak !== gammelHenleggelsesarsak;

  const beskrivelseVerdi = (beskrivelseControl.value ?? "").trim();

  function nullstill() {
    form.reset();
    setValgtHenleggelsesarsak("");
    setFase("skjema");
    setInnsendingFormData(null);
    setFeilmelding(null);
  }

  function handleDismiss() {
    if (erSubmitting) return;
    if (fase !== "suksess") {
      sporHendelse("endre status dialog avbrutt");
    }
    nullstill();
    onClose();
  }

  function handleAvbrytBekreftelse() {
    sporHendelse("endre status avbrutt i bekreftelse");
    setFase("skjema");
  }

  function handleBekreft() {
    if (!innsendingFormData) return;
    sporHendelse("endre status lagre klikket", {
      fraSteg: nåværendeSteg,
      tilSteg: valgtSteg,
    });
    setBekreftetResultat({
      steg: valgtSteg,
      stegEndret,
      status: valgtStatus,
      statusEndret,
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
      stegControl.change(nåværendeSteg);
      statusControl.change(nåværendeStatus ?? "AKTIV");
      beskrivelseControl.change("");
      setValgtHenleggelsesarsak(
        nåværendeSteg === "HENLAGT" ? (nåværendeHenleggelsesarsak ?? "") : "",
      );
      setFase("skjema");
      setInnsendingFormData(null);
      setFeilmelding(null);
      setBekreftetResultat(null);
    }
    forrigeÅpen.current = åpen;
    // stegControl/statusControl/beskrivelseControl er bevisst utelatt: useInputControl
    // returnerer nye objektreferanser ved hver render, så å inkludere dem ville trigget
    // effekten på nytt hele tiden. Vi trenger kun de nyeste `.change`-funksjonene når
    // modalen faktisk åpnes (styrt av åpen/forrigeÅpen.current), ikke ved hver render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [åpen, nåværendeStatus, nåværendeHenleggelsesarsak, nåværendeSteg]);

  useEffect(() => {
    if (!submitPågår.current || fetcher.state !== "idle") {
      return;
    }

    if (fetcher.data && "ok" in fetcher.data && fetcher.data.ok) {
      sporHendelse("endre status lagret");
      setFeilmelding(null);
      setFase("suksess");
    } else {
      sporHendelse("endre status lagring feilet");
      setFeilmelding("Kunne ikke endre status. Prøv igjen.");
      setFase("bekreft");
    }
    submitPågår.current = false;
  }, [fetcher.data, fetcher.state]);

  return (
    <Modal
      open={åpen}
      onClose={handleDismiss}
      header={
        fase === "suksess" ? undefined : { heading: "Endre steg", icon: <PencilIcon aria-hidden /> }
      }
      aria-label={fase === "suksess" ? "Lagret" : "Endre steg"}
      width={fase === "skjema" ? "medium" : "small"}
    >
      {fase === "suksess" && <Modal.Header />}
      <fetcher.Form method="post" {...getFormProps(form)}>
        <Modal.Body>
          {fase === "skjema" && (
            <VStack gap="space-4">
              <VStack gap="space-8">
                <input
                  key={fields.steg.key}
                  name={fields.steg.name}
                  value={valgtSteg}
                  readOnly
                  hidden
                  tabIndex={-1}
                  onFocus={() => stegControl.focus()}
                />
                <RadioGroup
                  legend="Steg"
                  value={valgtSteg}
                  onChange={(value) => {
                    stegControl.change(value);
                    sporHendelse("endre status saksstatus valgt", { steg: value });
                    if (value !== "HENLAGT") {
                      setValgtHenleggelsesarsak("");
                    }
                  }}
                  onBlur={stegControl.blur}
                  error={fields.steg.errors?.[0]}
                >
                  {valgbareSteg.map((s) => (
                    <Radio key={s} value={s}>
                      {formaterSteg(s)}
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
                  key={fields.status.key}
                  name={fields.status.name}
                  value={valgtStatus}
                  readOnly
                  hidden
                  tabIndex={-1}
                  onFocus={() => statusControl.focus()}
                />
                {!erAvsluttet ? (
                  <>
                    <RadioGroup
                      legend="Status"
                      value={valgtStatus}
                      onChange={(value) => {
                        statusControl.change(value);
                        sporHendelse("endre status arbeidsstatus valgt", { status: value });
                      }}
                      onBlur={statusControl.blur}
                      error={fields.status.errors?.[0]}
                    >
                      {statusValg.map((valg) => (
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

          {fase === "bekreft" && (
            <VStack gap="space-16">
              <BodyShort>Du endrer nå steg og status på saken:</BodyShort>
              <div className="rounded-md bg-ax-bg-neutral-soft px-5 py-4">
                <HGrid columns="auto 1fr" gap="space-4 space-16">
                  <SammendragRad
                    label="Steg"
                    verdi={
                      stegEndret
                        ? `Fra «${gammelStegLabel}» til «${nyttStegLabel}»`
                        : `«${nyttStegLabel}» (uendret)`
                    }
                  />
                  {statusEndret && (
                    <SammendragRad
                      label="Status"
                      verdi={`Fra «${formaterValgtStatus(gammelStatus)}» til «${formaterValgtStatus(valgtStatus)}»`}
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

          {fase === "suksess" && (
            <VStack gap="space-16" align="center" className="py-6 text-center">
              <CheckmarkCircleFillIcon
                aria-hidden
                fontSize="3rem"
                className="text-ax-bg-success-strong"
              />
              <VStack gap="space-4" align="center">
                <BodyShort weight="semibold">Lagret</BodyShort>
                <BodyShort textColor="subtle">
                  {byggSuksessmelding(sakId, bekreftetResultat)}
                </BodyShort>
              </VStack>
            </VStack>
          )}
        </Modal.Body>
        <Modal.Footer>
          {fase === "skjema" && (
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
          {fase === "bekreft" && (
            <>
              <Button
                type="button"
                variant="primary"
                onClick={handleBekreft}
                loading={erSubmitting}
                disabled={erSubmitting}
              >
                Endre steg
              </Button>
              <Button variant="secondary" onClick={handleAvbrytBekreftelse} disabled={erSubmitting}>
                Avbryt
              </Button>
            </>
          )}
          {fase === "suksess" && (
            <Button variant="primary" onClick={handleDismiss}>
              Lukk
            </Button>
          )}
        </Modal.Footer>
      </fetcher.Form>
    </Modal>
  );
}
