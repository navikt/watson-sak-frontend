import { getFormProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import {
  ArrowForwardIcon,
  CheckmarkCircleFillIcon,
  ExclamationmarkTriangleIcon,
} from "@navikt/aksel-icons";
import { BodyShort, Button, HGrid, InfoCard, Modal, Select, VStack } from "@navikt/ds-react";
import { useEffect, useRef, useState } from "react";
import { useFetcher, useNavigate } from "react-router";
import { z } from "zod";
import { sporHendelse } from "~/analytics/analytics";
import { useKodeverk } from "~/kodeverk/useKodeverk";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import type { KontrollsakSaksbehandler } from "~/saker/types.backend";

interface SendTilAnnenEnhetModalProps {
  sakId: string;
  nåværendeEnhet: string;
  ansvarligSaksbehandler: KontrollsakSaksbehandler | null;
  innloggetNavIdent: string;
  åpen: boolean;
  onClose: () => void;
}

const sendTilAnnenEnhetSkjema = z.object({
  seksjon: z.string({ error: "Velg en enhet" }).min(1, "Velg en enhet"),
});

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
  nåværendeEnhet,
  ansvarligSaksbehandler,
  innloggetNavIdent,
  åpen,
  onClose,
}: SendTilAnnenEnhetModalProps) {
  const fetcher = useFetcher<{ ok: boolean }>();
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
      setSteg("suksess");
    } else {
      sporHendelse("send til annen enhet sending feilet");
      setFeilmelding("Kunne ikke sende saken til annen enhet. Prøv igjen.");
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
      setInnsendingFormData(formData);
      setSteg("bekreft");
    },
  });

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
                onChange={(event) => setValgtEnhet(event.target.value)}
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
            </VStack>
          )}
          {steg === "bekreft" && (
            <VStack gap="space-16">
              <BodyShort>Du sender nå saken til en annen enhet:</BodyShort>
              <div className="rounded-md bg-ax-bg-neutral-soft px-5 py-4">
                <HGrid columns="auto 1fr" gap="space-4 space-16">
                  <SammendragRad label="Sak" verdi={`#${saksreferanse}`} />
                  <SammendragRad
                    label="Ny enhet"
                    verdi={
                      kodeverk.enheter.find((enhet) => enhet.kode === valgtEnhet)?.beskrivelse ??
                      valgtEnhet
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
                  Sak #{saksreferanse} er sendt til {bekreftetEnhet}.
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
              <Button variant="secondary" onClick={handleAvbrytBekreftelse} disabled={erSubmitting}>
                Avbryt
              </Button>
              <Button
                type="button"
                onClick={handleBekreft}
                loading={erSubmitting}
                disabled={erSubmitting}
              >
                Send til annen enhet
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
