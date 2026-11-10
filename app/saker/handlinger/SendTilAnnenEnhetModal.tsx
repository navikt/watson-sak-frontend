import { getFormProps, useForm, useInputControl } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import {
  ArrowForwardIcon,
  CheckmarkCircleFillIcon,
  ExclamationmarkTriangleIcon,
} from "@navikt/aksel-icons";
import {
  BodyShort,
  Button,
  HGrid,
  InfoCard,
  Modal,
  Select,
  UNSAFE_Combobox,
  VStack,
} from "@navikt/ds-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFetcher, useNavigate } from "react-router";
import { z } from "zod";
import { sporHendelse } from "~/analytics/analytics";
import { erTekniskFeilSvar, Innsendingsfeil } from "~/feilhåndtering/Innsendingsfeil";
import { INNSENDINGSFEIL } from "~/feilhåndtering/feilmeldinger";
import { useKodeverk } from "~/kodeverk/useKodeverk";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import type { KontrollsakSaksbehandler, KontrollsakSteg } from "~/saker/types.backend";
import { kanMottaSakFraEnhet } from "./mottaksenhet";

interface SendTilAnnenEnhetModalProps {
  sakId: string;
  steg: KontrollsakSteg;
  nåværendeEnhet: string;
  ansvarligSaksbehandler: KontrollsakSaksbehandler | null;
  saksbehandlerDetaljer: KontrollsakSaksbehandler[];
  innloggetNavIdent: string;
  åpen: boolean;
  onClose: () => void;
}

type Steg = "skjema" | "bekreft" | "suksess";

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

export function SendTilAnnenEnhetModal({
  sakId,
  steg: sakSteg,
  nåværendeEnhet,
  ansvarligSaksbehandler,
  saksbehandlerDetaljer,
  innloggetNavIdent,
  åpen,
  onClose,
}: SendTilAnnenEnhetModalProps) {
  const fetcher = useFetcher<{ ok: boolean; feil?: string }>();
  const navigate = useNavigate();
  const kodeverk = useKodeverk();
  const saksreferanse = getSaksreferanse(sakId);
  const erSubmitting = fetcher.state !== "idle";
  const submitPågår = useRef(false);
  const forrigeÅpen = useRef(false);
  const [steg, setSteg] = useState<Steg>("skjema");
  const [innsendingFormData, setInnsendingFormData] = useState<FormData | null>(null);
  const [valgtEnhet, setValgtEnhet] = useState("");
  const [bekreftetEnhet, setBekreftetEnhet] = useState<string | null>(null);
  const [feilmelding, setFeilmelding] = useState<string | null>(null);
  const [tekniskFeilSvar, setTekniskFeilSvar] = useState<unknown>(null);
  const kreverNyAnsvarlig = sakSteg !== "OPPRETTET";
  const valgbareSaksbehandlere = valgtEnhet
    ? saksbehandlerDetaljer.filter(
        (saksbehandler) =>
          saksbehandler.navIdent !== ansvarligSaksbehandler?.navIdent &&
          kanMottaSakFraEnhet(saksbehandler, valgtEnhet),
      )
    : [];
  const sendTilAnnenEnhetSkjema = useMemo(
    () =>
      z
        .object({
          seksjon: z.string({ error: "Velg en enhet" }).min(1, "Velg en enhet"),
          ansvarligNavIdent: z.string().optional(),
        })
        .superRefine((verdier, kontekst) => {
          if (kreverNyAnsvarlig && !verdier.ansvarligNavIdent) {
            kontekst.addIssue({
              code: "custom",
              path: ["ansvarligNavIdent"],
              message: "Velg en ny ansvarlig saksbehandler",
            });
          }
        }),
    [kreverNyAnsvarlig],
  );
  const tilgangsvarsel = ansvarligSaksbehandler
    ? ansvarligSaksbehandler.navIdent === innloggetNavIdent
      ? "Du fjernes da fra saken og mister tilgang til dokumentasjonen i saken."
      : `${ansvarligSaksbehandler.navn} fjernes da fra saken og mister tilgang til dokumentasjonen i saken.`
    : null;

  useEffect(() => {
    if (åpen && !forrigeÅpen.current) {
      sporHendelse("send til annen enhet dialog åpnet");
      setSteg("skjema");
      setValgtEnhet("");
      setInnsendingFormData(null);
      setBekreftetEnhet(null);
      setFeilmelding(null);
      setTekniskFeilSvar(null);
    }
    forrigeÅpen.current = åpen;
  }, [åpen]);

  useEffect(() => {
    if (!submitPågår.current || fetcher.state !== "idle") {
      return;
    }

    if (fetcher.data?.ok) {
      sporHendelse("send til annen enhet sendt");
      setFeilmelding(null);
      setTekniskFeilSvar(null);
      setSteg("suksess");
    } else {
      sporHendelse("send til annen enhet sending feilet");
      const teknisk = erTekniskFeilSvar(fetcher.data);
      setTekniskFeilSvar(teknisk ? fetcher.data : null);
      setFeilmelding(
        teknisk
          ? null
          : (fetcher.data?.feil ?? "Kunne ikke sende saken til annen enhet. Prøv igjen."),
      );
      setSteg("bekreft");
    }
    submitPågår.current = false;
  }, [fetcher.data, fetcher.state]);

  const [form, fields] = useForm({
    id: "send-til-annen-enhet",
    constraint: getZodConstraint(sendTilAnnenEnhetSkjema),
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: sendTilAnnenEnhetSkjema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    onSubmit(event, { formData }) {
      event.preventDefault();
      formData.set("handling", "send_til_annen_enhet");
      sporHendelse("send til annen enhet bekreftelse vist", {
        fraEnhet: nåværendeEnhet,
        tilEnhet: formData.get("seksjon"),
      });
      setFeilmelding(null);
      setTekniskFeilSvar(null);
      setInnsendingFormData(formData);
      setSteg("bekreft");
    },
  });

  const ansvarligNavIdent = useInputControl(fields.ansvarligNavIdent);
  const valgtAnsvarligNavIdent = ansvarligNavIdent.value ?? "";
  const valgtAnsvarlig = valgbareSaksbehandlere.find(
    (saksbehandler) => saksbehandler.navIdent === valgtAnsvarligNavIdent,
  );

  useEffect(() => {
    if (åpen) {
      ansvarligNavIdent.change("");
    }
  }, [åpen]);

  function handleBekreft() {
    if (!innsendingFormData) return;
    sporHendelse("send til annen enhet klikket", {
      fraEnhet: nåværendeEnhet,
      tilEnhet: innsendingFormData.get("seksjon"),
    });
    setBekreftetEnhet(
      kodeverk.enheter.find((enhet) => enhet.kode === innsendingFormData.get("seksjon"))
        ?.beskrivelse ?? String(innsendingFormData.get("seksjon")),
    );
    submitPågår.current = true;
    fetcher.submit(innsendingFormData, {
      method: "post",
      action: RouteConfig.SAKER_DETALJ.replace(":sakId", saksreferanse),
    });
  }

  function handleAvbrytBekreftelse() {
    sporHendelse("send til annen enhet avbrutt i bekreftelse");
    setSteg("skjema");
  }

  function handleClose() {
    if (erSubmitting) return;
    form.reset();
    setSteg("skjema");
    setValgtEnhet("");
    setInnsendingFormData(null);
    setFeilmelding(null);
    setTekniskFeilSvar(null);
    setBekreftetEnhet(null);
    onClose();
  }

  return (
    <Modal
      open={åpen}
      onClose={handleClose}
      header={
        steg === "suksess"
          ? undefined
          : { heading: "Send til annen enhet", icon: <ArrowForwardIcon aria-hidden /> }
      }
      aria-label={steg === "suksess" ? "Sak sendt til annen enhet" : "Send til annen enhet"}
      width="small"
    >
      <fetcher.Form method="post" {...getFormProps(form)}>
        <Modal.Body>
          {steg === "skjema" && (
            <VStack gap="space-4">
              <BodyShort>Velg enhet saken skal sendes til.</BodyShort>
              <Select
                key={fields.seksjon.key}
                name={fields.seksjon.name}
                id={fields.seksjon.id}
                value={valgtEnhet}
                onChange={(event) => {
                  setValgtEnhet(event.target.value);
                  ansvarligNavIdent.change("");
                }}
                label="Ny enhet"
                error={fields.seksjon.errors?.[0]}
              >
                <option value="">Velg enhet</option>
                {kodeverk.enheter.map((enhet) => (
                  <option
                    key={enhet.kode}
                    value={enhet.kode}
                    disabled={enhet.kode === nåværendeEnhet}
                  >
                    {enhet.beskrivelse}
                  </option>
                ))}
              </Select>
              <input
                type="hidden"
                name={fields.ansvarligNavIdent.name}
                value={valgtAnsvarligNavIdent}
                tabIndex={-1}
                onFocus={() => ansvarligNavIdent.focus()}
              />
              <UNSAFE_Combobox
                key={fields.ansvarligNavIdent.key}
                id={fields.ansvarligNavIdent.id}
                label="Ny ansvarlig saksbehandler"
                description={
                  kreverNyAnsvarlig
                    ? undefined
                    : "Valgfritt. Uten ny ansvarlig blir saken ufordelt i mottaksenheten."
                }
                placeholder={valgtEnhet ? "Søk etter saksbehandler" : "Velg enhet først"}
                disabled={!valgtEnhet}
                options={valgbareSaksbehandlere.map((saksbehandler) => ({
                  value: saksbehandler.navIdent,
                  label: `${saksbehandler.navn} (${saksbehandler.navIdent})`,
                }))}
                selectedOptions={
                  valgtAnsvarlig
                    ? [
                        {
                          value: valgtAnsvarlig.navIdent,
                          label: `${valgtAnsvarlig.navn} (${valgtAnsvarlig.navIdent})`,
                        },
                      ]
                    : []
                }
                onToggleSelected={(navIdent, erValgt) => {
                  ansvarligNavIdent.change(erValgt ? navIdent : "");
                }}
                error={fields.ansvarligNavIdent.errors?.[0]}
              />
            </VStack>
          )}
          {steg === "bekreft" && (
            <VStack gap="space-16">
              <BodyShort>Du sender nå saken til en annen enhet:</BodyShort>
              <div className="rounded-md bg-ax-bg-neutral-soft px-5 py-4">
                <HGrid columns="auto 1fr" gap="space-4 space-16">
                  <SammendragRad label="Sak" verdi={saksreferanse} />
                  <SammendragRad
                    label="Ny enhet"
                    verdi={
                      kodeverk.enheter.find((enhet) => enhet.kode === valgtEnhet)?.beskrivelse ??
                      valgtEnhet
                    }
                  />
                  <SammendragRad
                    label="Ny ansvarlig saksbehandler"
                    verdi={
                      valgtAnsvarlig
                        ? `${valgtAnsvarlig.navn} (${valgtAnsvarlig.navIdent})`
                        : "Ingen, saken blir ufordelt"
                    }
                  />
                </HGrid>
              </div>
              {tilgangsvarsel && (
                <InfoCard size="small" data-color="warning">
                  <InfoCard.Message icon={<ExclamationmarkTriangleIcon aria-hidden />}>
                    {tilgangsvarsel}
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
                <BodyShort weight="semibold">Sak sendt til annen enhet</BodyShort>
                <BodyShort textColor="subtle">
                  Sak {saksreferanse} er sendt til {bekreftetEnhet}.
                </BodyShort>
              </VStack>
            </VStack>
          )}
        </Modal.Body>
        <Modal.Footer>
          {steg === "skjema" && (
            <>
              <Button type="submit" disabled={erSubmitting} loading={erSubmitting}>
                Fortsett
              </Button>
              <Button variant="secondary" onClick={handleClose} disabled={erSubmitting}>
                Avbryt
              </Button>
            </>
          )}
          {steg === "bekreft" && (
            <>
              <Innsendingsfeil svar={tekniskFeilSvar} tekster={INNSENDINGSFEIL.sendTilEnhet} />
              <Button
                type="button"
                onClick={handleBekreft}
                loading={erSubmitting}
                disabled={erSubmitting}
              >
                Send til annen enhet
              </Button>
              <Button variant="secondary" onClick={handleAvbrytBekreftelse} disabled={erSubmitting}>
                Avbryt
              </Button>
            </>
          )}
          {steg === "suksess" && (
            <Button
              onClick={() => {
                void navigate(RouteConfig.INDEX);
                handleClose();
              }}
            >
              Lukk
            </Button>
          )}
        </Modal.Footer>
      </fetcher.Form>
    </Modal>
  );
}
