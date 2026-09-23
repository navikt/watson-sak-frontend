import { useEffect, useRef, useState } from "react";
import {
  BodyShort,
  Button,
  Checkbox,
  Modal,
  Radio,
  RadioGroup,
  Select,
  Switch,
  Textarea,
  TextField,
  VStack,
} from "@navikt/ds-react";
import { useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import type {
  KontrollsakSteg,
  KontrollsakStatus,
  TillatteHandlingerResponse,
} from "~/saker/types.backend";
import { formaterStatus, formaterSteg } from "~/saker/visning";
import {
  resultatFeltErAktivt,
  resultatFeltErPaakrevd,
  byggLagreResultatRequest,
  hentTvangsverdierForResultat,
  støttedeResultatfelter,
} from "./resultat-request";

type Handlingstype = TillatteHandlingerResponse["handlinger"][number]["type"];
type ModalFase = "skjema" | "bekreft" | "suksess";

interface EndreStatusModalProps {
  sakId: string;
  tillatteHandlinger: TillatteHandlingerResponse;
  handling: Handlingstype | null;
  onClose: () => void;
}

const handlingsetiketter: Record<Handlingstype, string> = {
  FLYTT_TIL_NESTE_STEG: "Flytt til neste steg",
  ENDRE_STATUS: "Endre status",
  REGISTRER_RESULTAT: "Registrer resultat",
  HENLEGG: "Registrer henleggelse",
  SETT_I_BERO: "Sett i bero",
  TA_UT_AV_BERO: "Ta ut av bero",
};

function formaterValgtStatus(status: KontrollsakStatus | null): string {
  return status === null ? "Ingen status" : formaterStatus(status);
}

function statusverdi(status: KontrollsakStatus | null): string {
  return status ?? "";
}

function lesStatus(verdi: string): KontrollsakStatus | null {
  return (verdi || null) as KontrollsakStatus | null;
}

function hentSkjemastatus(
  tillatteHandlinger: TillatteHandlingerResponse,
  valgtStatus: string,
): string {
  if (tillatteHandlinger.tillatteStatuser.some((status) => statusverdi(status) === valgtStatus)) {
    return valgtStatus;
  }
  return statusverdi(tillatteHandlinger.tillatteStatuser[0] ?? null);
}

function hentHandlingensApiType(handling: Handlingstype): string {
  switch (handling) {
    case "FLYTT_TIL_NESTE_STEG":
      return "endre_steg_dialog";
    case "ENDRE_STATUS":
      return "endre_status";
    case "REGISTRER_RESULTAT":
      return "registrer_resultat";
    case "HENLEGG":
      return "henlegg";
    case "SETT_I_BERO":
      return "sett_i_bero";
    case "TA_UT_AV_BERO":
      return "ta_ut_av_bero";
  }
}

function hentRegistrerteResultatverdier(
  tillatteHandlinger: TillatteHandlingerResponse,
): Record<string, string> {
  const verdier: Record<string, string> = {};
  for (const felt of tillatteHandlinger.feltskjema) {
    if (felt.datatype === "belop") continue;
    const erEndeligUtfall = felt.felt.startsWith("forvaltning.endeligUtfall.");
    const resultat = tillatteHandlinger.tilstand.resultat;
    let verdi: unknown = erEndeligUtfall
      ? (resultat?.forvaltning?.endeligUtfall ?? resultat?.endeligUtfall)
      : resultat;
    for (const del of felt.felt.split(".").slice(erEndeligUtfall ? 2 : 0)) {
      verdi =
        verdi !== null && typeof verdi === "object" && del in verdi
          ? (verdi as Record<string, unknown>)[del]
          : undefined;
    }
    if (typeof verdi === "string" || typeof verdi === "boolean") {
      verdier[felt.felt] = String(verdi);
    }
  }
  return verdier;
}

function ResultatFelt({
  felt,
  tillatteHandlinger,
  verdier,
  onChange,
  tvungetVerdi,
  belopPaakrevd = false,
}: {
  felt: TillatteHandlingerResponse["feltskjema"][number];
  tillatteHandlinger: TillatteHandlingerResponse;
  verdier: Record<string, string>;
  onChange: (felt: string, verdi: string) => void;
  tvungetVerdi?: string;
  belopPaakrevd?: boolean;
}) {
  if (felt.datatype === "belop") {
    const nøkkel = felt.felt.endsWith(".endeligBelop") ? "endeligBelop" : "belop";
    return tillatteHandlinger.tilstand.ytelser.map((ytelse, indeks) => {
      const navn = `ytelse.${ytelse.id}.${nøkkel}`;
      const lagretVerdi =
        ytelse[nøkkel] === null
          ? ""
          : new Intl.NumberFormat("nb-NO", { useGrouping: false, maximumFractionDigits: 2 }).format(
              ytelse[nøkkel],
            );
      const verdi = verdier[navn] ?? lagretVerdi;
      return (
        <TextField
          key={`${felt.felt}-${ytelse.id}`}
          label={`${felt.etikett} ${indeks + 1} (${ytelse.type})`}
          name={navn}
          value={verdi}
          onChange={(event) => onChange(navn, event.target.value)}
          inputMode="decimal"
          required={belopPaakrevd}
          type="text"
        />
      );
    });
  }

  const erTypefelt = felt.felt.endsWith(".type");
  const tvunget = erTypefelt ? tvungetVerdi : undefined;
  const verdi = tvunget ?? verdier[felt.felt] ?? (felt.datatype === "boolsk" ? "false" : "");
  const erPaakrevd = resultatFeltErPaakrevd(felt, verdier);
  const name = `resultat.${felt.felt}`;

  if (felt.datatype === "enum") {
    const alternativer =
      erTypefelt && tvunget
        ? felt.verdier.filter((valg) => valg.verdi === tvunget)
        : erTypefelt
          ? felt.verdier.filter((valg) =>
              tillatteHandlinger.tillatteResultater.some((resultat) => resultat === valg.verdi),
            )
          : felt.verdier;
    return (
      <>
        {tvunget && <input type="hidden" name={name} value={tvunget} />}
        <Select
          label={felt.etikett}
          name={tvunget ? undefined : name}
          value={verdi}
          onChange={(event) => onChange(felt.felt, event.target.value)}
          aria-required={erPaakrevd || undefined}
          disabled={Boolean(tvunget)}
        >
          <option value="">Velg {felt.etikett.toLowerCase()}</option>
          {alternativer.map((valg) => (
            <option key={valg.verdi} value={valg.verdi}>
              {valg.etikett}
            </option>
          ))}
        </Select>
      </>
    );
  }

  if (felt.datatype === "boolsk") {
    return (
      <>
        <input type="hidden" name={name} value={verdi} />
        <Switch
          checked={verdi === "true"}
          onChange={(event) => onChange(felt.felt, String(event.target.checked))}
        >
          {felt.etikett}
        </Switch>
      </>
    );
  }

  return (
    <TextField
      label={felt.etikett}
      name={name}
      value={verdi}
      onChange={(event) => onChange(felt.felt, event.target.value)}
      aria-required={erPaakrevd || undefined}
      type="text"
    />
  );
}

export function EndreStatusModal({
  sakId,
  tillatteHandlinger,
  handling,
  onClose,
}: EndreStatusModalProps) {
  const fetcher = useFetcher();
  const erSubmitting = fetcher.state !== "idle";
  const submitPågår = useRef(false);
  const forrigeHandling = useRef<Handlingstype | null>(null);
  const [fase, setFase] = useState<ModalFase>("skjema");
  const [innsendingFormData, setInnsendingFormData] = useState<FormData | null>(null);
  const [feilmelding, setFeilmelding] = useState<string | null>(null);
  const [valgtSteg, setValgtSteg] = useState<KontrollsakSteg | "">("");
  const [valgtStatus, setValgtStatus] = useState("");
  const [registrerResultat, setRegistrerResultat] = useState(false);
  const [resultatverdier, setResultatverdier] = useState<Record<string, string>>({});
  const erÅpen = handling !== null;
  const feltskjema = støttedeResultatfelter(tillatteHandlinger.feltskjema);
  const henleggType =
    handling === "HENLEGG"
      ? (tillatteHandlinger.handlinger.find((valg) => valg.type === "HENLEGG")?.resultatType ??
        "HENLAGT")
      : undefined;
  const tvungneResultatverdier = henleggType
    ? hentTvangsverdierForResultat(feltskjema, henleggType)
    : {};

  useEffect(() => {
    if (handling && handling !== forrigeHandling.current) {
      setFase("skjema");
      setInnsendingFormData(null);
      setFeilmelding(null);
      setValgtSteg("");
      setValgtStatus(statusverdi(tillatteHandlinger.tilstand.status));
      setRegistrerResultat(false);
      setResultatverdier({
        ...hentRegistrerteResultatverdier(tillatteHandlinger),
        ...tvungneResultatverdier,
      });
    }
    forrigeHandling.current = handling;
  }, [handling, tillatteHandlinger.tilstand.status, feltskjema, henleggType]);

  const valgtHandlingLabel = handling ? handlingsetiketter[handling] : "";
  const erStegskjema = handling === "FLYTT_TIL_NESTE_STEG";
  const paakrevdeFelterForOvergang = valgtSteg
    ? (tillatteHandlinger.paakrevdeRegistreringerPerSteg[valgtSteg] ?? [])
    : [];
  const overgangKreverBelop = paakrevdeFelterForOvergang.some((felt) =>
    felt.startsWith("ytelser[]."),
  );
  const harResultatfelt = feltskjema.length > 0;
  const visResultatfelt =
    handling === "REGISTRER_RESULTAT" ||
    handling === "HENLEGG" ||
    (erStegskjema && (registrerResultat || overgangKreverBelop));
  const visResultatfeltForSteg = registrerResultat;

  function nullstill() {
    setFase("skjema");
    setInnsendingFormData(null);
    setFeilmelding(null);
    setResultatverdier({});
    setRegistrerResultat(false);
  }

  function handleDismiss() {
    if (erSubmitting) return;
    nullstill();
    onClose();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!handling) return;
    const formData = new FormData(event.currentTarget);
    formData.set("handling", hentHandlingensApiType(handling));
    if (erStegskjema) {
      if (!valgtSteg) {
        setFeilmelding("Velg et steg.");
        return;
      }
      formData.set("steg", valgtSteg);
      formData.set("registrerResultat", String(registrerResultat));
    }
    if (handling === "ENDRE_STATUS") {
      formData.set("status", valgtStatus);
    } else if (handling === "SETT_I_BERO") {
      formData.set("status", "I_BERO");
    } else if (handling === "TA_UT_AV_BERO") {
      formData.set("status", statusverdi(tillatteHandlinger.tilstand.statusFørBero));
    }
    if (handling === "REGISTRER_RESULTAT" || handling === "HENLEGG" || erStegskjema) {
      try {
        const resultat = byggLagreResultatRequest(
          formData,
          tillatteHandlinger.feltskjema,
          tillatteHandlinger.tilstand.steg,
          henleggType,
          tillatteHandlinger.tilstand.ytelser,
          !erStegskjema || registrerResultat,
        );
        if (
          !resultat &&
          (handling === "REGISTRER_RESULTAT" ||
            handling === "HENLEGG" ||
            (erStegskjema && registrerResultat))
        ) {
          setFeilmelding("Velg et resultat før du fortsetter.");
          return;
        }
      } catch (feil) {
        setFeilmelding(feil instanceof Error ? feil.message : "Kontroller resultatfeltene.");
        return;
      }
    }
    setFeilmelding(null);
    setInnsendingFormData(formData);
    setFase("bekreft");
  }

  function handleBekreft() {
    if (!innsendingFormData) return;
    submitPågår.current = true;
    fetcher.submit(innsendingFormData, {
      method: "post",
      action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId)),
    });
  }

  useEffect(() => {
    if (!submitPågår.current || fetcher.state !== "idle") return;
    if (fetcher.data && "ok" in fetcher.data && fetcher.data.ok) {
      setFeilmelding(null);
      setFase("suksess");
    } else {
      setFeilmelding("Kunne ikke lagre endringen. Prøv igjen.");
      setFase("bekreft");
    }
    submitPågår.current = false;
  }, [fetcher.data, fetcher.state]);

  const aktiveResultatfelter = feltskjema.filter((felt) => {
    if (erStegskjema && !visResultatfeltForSteg && felt.datatype !== "belop") return false;
    return resultatFeltErAktivt(felt, { ...resultatverdier, ...tvungneResultatverdier });
  });

  const valgStatus = hentSkjemastatus(tillatteHandlinger, valgtStatus);

  return (
    <Modal
      open={erÅpen}
      onClose={handleDismiss}
      header={fase === "suksess" ? undefined : { heading: valgtHandlingLabel }}
      aria-label={fase === "suksess" ? "Lagret" : valgtHandlingLabel}
      width="medium"
    >
      {fase === "suksess" && <Modal.Header />}
      <fetcher.Form method="post" onSubmit={handleSubmit}>
        <Modal.Body>
          {fase === "skjema" && (
            <VStack gap="space-16">
              <input type="hidden" name="versjon" value={tillatteHandlinger.versjon} />
              {erStegskjema && (
                <RadioGroup
                  legend="Tillatte steg"
                  name="steg"
                  value={valgtSteg}
                  onChange={(verdi) => setValgtSteg(verdi as KontrollsakSteg)}
                >
                  {tillatteHandlinger.tillatteSteg.map((steg) => (
                    <Radio key={steg} value={steg}>
                      {formaterSteg(steg)}
                    </Radio>
                  ))}
                </RadioGroup>
              )}

              {handling === "ENDRE_STATUS" && (
                <Select
                  label="Status"
                  value={valgStatus}
                  onChange={(event) => setValgtStatus(event.target.value)}
                >
                  {tillatteHandlinger.tillatteStatuser.map((status, indeks) => (
                    <option key={`${status ?? "null"}-${indeks}`} value={statusverdi(status)}>
                      {status === null
                        ? tillatteHandlinger.tilstand.status === "I_BERO"
                          ? "Gjenoppta"
                          : "Ingen status"
                        : formaterValgtStatus(status)}
                    </option>
                  ))}
                </Select>
              )}

              {erStegskjema && harResultatfelt && (
                <Checkbox
                  checked={registrerResultat}
                  onChange={(event) => setRegistrerResultat(event.target.checked)}
                >
                  Registrer resultat fra gjeldende steg
                </Checkbox>
              )}

              {visResultatfelt && (
                <VStack gap="space-12">
                  {aktiveResultatfelter.map((felt) => (
                    <ResultatFelt
                      key={felt.felt}
                      felt={felt}
                      tillatteHandlinger={tillatteHandlinger}
                      verdier={{
                        ...resultatverdier,
                        ...tvungneResultatverdier,
                      }}
                      onChange={(navn, verdi) =>
                        setResultatverdier((forrige) => ({ ...forrige, [navn]: verdi }))
                      }
                      tvungetVerdi={tvungneResultatverdier[felt.felt]}
                      belopPaakrevd={
                        overgangKreverBelop && paakrevdeFelterForOvergang.includes(felt.felt)
                      }
                    />
                  ))}
                </VStack>
              )}

              {handling === "TA_UT_AV_BERO" && (
                <p>
                  Når du gjenopptar saken, blir statusen{" "}
                  {tillatteHandlinger.tilstand.statusFørBero
                    ? formaterStatus(tillatteHandlinger.tilstand.statusFørBero)
                    : "Ingen status"}
                  .
                </p>
              )}

              {(erStegskjema || handling === "ENDRE_STATUS") && (
                <Textarea
                  name="beskrivelse"
                  label="Beskrivelse (valgfritt)"
                  minRows={2}
                  maxRows={5}
                />
              )}

              {feilmelding && <p role="alert">{feilmelding}</p>}
            </VStack>
          )}

          {fase === "bekreft" && (
            <VStack gap="space-8">
              <p>
                {erStegskjema && valgtSteg
                  ? `Saken flyttes til ${formaterSteg(valgtSteg)}.`
                  : handling === "ENDRE_STATUS"
                    ? `Statusen endres til ${formaterValgtStatus(lesStatus(valgtStatus))}.`
                    : handling === "SETT_I_BERO"
                      ? "Saken settes i bero."
                      : handling === "TA_UT_AV_BERO"
                        ? "Saken tas ut av bero."
                        : handling === "HENLEGG"
                          ? "Henleggelsesresultatet lagres i gjeldende steg. Flytt saken til Avsluttet etterpå."
                          : "Resultatet registreres for gjeldende steg."}
              </p>
              {feilmelding && <p role="alert">{feilmelding}</p>}
            </VStack>
          )}

          {fase === "suksess" && (
            <VStack gap="space-8" align="center" className="py-6 text-center">
              <BodyShort weight="semibold">Lagret</BodyShort>
              <BodyShort textColor="subtle">
                Endringen på sak #{getSaksreferanse(sakId)} er lagret.
              </BodyShort>
            </VStack>
          )}
        </Modal.Body>
        <Modal.Footer>
          {fase === "skjema" && (
            <>
              <Button type="submit" variant="primary">
                Fortsett
              </Button>
              <Button type="button" variant="secondary" onClick={handleDismiss}>
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
                disabled={erSubmitting || !innsendingFormData}
              >
                {handling === "HENLEGG" ? "Lagre henleggelse" : "Bekreft"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={erSubmitting}
                onClick={() => setFase("skjema")}
              >
                Tilbake
              </Button>
            </>
          )}
          {fase === "suksess" && (
            <Button type="button" variant="primary" onClick={handleDismiss}>
              Lukk
            </Button>
          )}
        </Modal.Footer>
      </fetcher.Form>
    </Modal>
  );
}
