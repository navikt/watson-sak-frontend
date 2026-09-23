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
  støttedeResultatfelter,
} from "./resultat-request";
import {
  harLagretResultatForOvergang,
  hentVisbareSteg,
  manglerEndeligUtfallVedAvslutning,
} from "./tillatte-steg";

type Handlingstype = "FLYTT_TIL_NESTE_STEG" | "ENDRE_STATUS";
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

function passerTilMålsteg(felt: string, type: string, tilSteg: KontrollsakSteg): boolean {
  switch (felt) {
    case "utredning.type":
      return tilSteg === "FORVALTNING"
        ? type === "FEILUTBETALINGSSAK_ORDINAER" ||
            type === "FEILUTBETALINGSSAK_POTENSIELL_STRAFFESAK"
        : type === "KONTROLLNOTAT" || type === "HENLAGT";
    case "forvaltning.type":
      return tilSteg === "STRAFFERETTSLIG_VURDERING"
        ? type === "SAKEN_SKAL_VURDERES_FOR_ANMELDELSE"
        : type === "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE";
    case "strafferettsligVurdering.type":
      return tilSteg === "POLITI"
        ? type === "ANMELDT"
        : type === "KONTROLLNOTAT" || type === "FEILUTBETALINGSSAK_ORDINAER" || type === "HENLAGT";
    default:
      return true;
  }
}

function registrerteVerdierForMålsteg(
  tillatteHandlinger: TillatteHandlingerResponse,
  tilSteg: KontrollsakSteg,
): Record<string, string> {
  const verdier = hentRegistrerteResultatverdier(tillatteHandlinger);
  for (const felt of tillatteHandlinger.feltskjema) {
    if (
      felt.felt.endsWith(".type") &&
      verdier[felt.felt] &&
      (!passerTilMålsteg(felt.felt, verdier[felt.felt], tilSteg) ||
        !felt.verdier.some((valg) => valg.verdi === verdier[felt.felt]))
    ) {
      delete verdier[felt.felt];
      if (felt.felt === "forvaltning.endeligUtfall.type") {
        delete verdier["forvaltning.endeligUtfall.henleggelsesarsak"];
      } else {
        delete verdier[`${felt.felt.slice(0, -".type".length)}.henleggelsesarsak`];
      }
    }
  }
  if (tilSteg !== "AVSLUTTET") {
    delete verdier["forvaltning.endeligUtfall.type"];
    delete verdier["forvaltning.endeligUtfall.henleggelsesarsak"];
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
  tilSteg,
}: {
  felt: TillatteHandlingerResponse["feltskjema"][number];
  tillatteHandlinger: TillatteHandlingerResponse;
  verdier: Record<string, string>;
  onChange: (felt: string, verdi: string) => void;
  tvungetVerdi?: string;
  belopPaakrevd?: boolean;
  tilSteg?: KontrollsakSteg;
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
          ? felt.verdier.filter(
              (valg) =>
                tillatteHandlinger.tillatteResultater.some((resultat) => resultat === valg.verdi) &&
                (!tilSteg || passerTilMålsteg(felt.felt, valg.verdi, tilSteg)),
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
  useEffect(() => {
    if (handling && handling !== forrigeHandling.current) {
      setFase("skjema");
      setInnsendingFormData(null);
      setFeilmelding(null);
      setValgtSteg("");
      setValgtStatus(
        statusverdi(
          tillatteHandlinger.tilstand.status === "I_BERO"
            ? tillatteHandlinger.tilstand.statusFørBero
            : tillatteHandlinger.tilstand.status,
        ),
      );
      setRegistrerResultat(false);
      setResultatverdier(hentRegistrerteResultatverdier(tillatteHandlinger));
    }
    forrigeHandling.current = handling;
  }, [
    handling,
    tillatteHandlinger.tilstand.status,
    tillatteHandlinger.tilstand.statusFørBero,
    feltskjema,
  ]);

  const valgtHandlingLabel = handling ? handlingsetiketter[handling] : "";
  const erStegskjema = handling === "FLYTT_TIL_NESTE_STEG";
  const tvungetForvaltningsutfall =
    erStegskjema && tillatteHandlinger.tilstand.steg === "FORVALTNING"
      ? valgtSteg === "AVSLUTTET"
        ? "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE"
        : valgtSteg === "STRAFFERETTSLIG_VURDERING"
          ? "SAKEN_SKAL_VURDERES_FOR_ANMELDELSE"
          : undefined
      : undefined;
  const tvungneResultatverdierForSteg: Record<string, string> = tvungetForvaltningsutfall
    ? { "forvaltning.type": tvungetForvaltningsutfall }
    : {};
  const skjemaverdier = {
    ...resultatverdier,
    ...tvungneResultatverdierForSteg,
  };
  const skalViseEndeligBelop =
    tillatteHandlinger.tilstand.steg !== "FORVALTNING" ||
    skjemaverdier["forvaltning.type"] === "SAKEN_SKAL_VURDERES_FOR_ANMELDELSE" ||
    skjemaverdier["forvaltning.endeligUtfall.type"] === "FEILUTBETALINGSSAK_ORDINAER";
  const resultatPåkrevd =
    erStegskjema &&
    valgtSteg !== "" &&
    (valgtSteg === "AVSLUTTET" || !harLagretResultatForOvergang(tillatteHandlinger, valgtSteg));
  const skalRegistrereResultat = registrerResultat || resultatPåkrevd;
  const paakrevdeFelterForOvergang = valgtSteg
    ? (tillatteHandlinger.paakrevdeRegistreringerPerSteg[valgtSteg] ?? [])
    : [];
  const overgangKreverBelop = paakrevdeFelterForOvergang.some((felt) =>
    felt.startsWith("ytelser[]."),
  );
  const harResultatfelt = feltskjema.length > 0;
  const visResultatfelt =
    erStegskjema && (skalRegistrereResultat || (overgangKreverBelop && skalViseEndeligBelop));
  const visResultatfeltForSteg = skalRegistrereResultat;

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
    formData.set("handling", erStegskjema ? "endre_steg_dialog" : "endre_status");
    if (erStegskjema) {
      if (!valgtSteg) {
        setFeilmelding("Velg et steg.");
        return;
      }
      formData.set("steg", valgtSteg);
      formData.set("registrerResultat", String(skalRegistrereResultat));
    }
    if (handling === "ENDRE_STATUS") {
      formData.set("status", valgtStatus);
    }
    if (erStegskjema) {
      try {
        const resultat = byggLagreResultatRequest(
          formData,
          tillatteHandlinger.feltskjema,
          tillatteHandlinger.tilstand.steg,
          undefined,
          tillatteHandlinger.tilstand.ytelser,
          !erStegskjema || skalRegistrereResultat,
        );
        if (!resultat && skalRegistrereResultat) {
          setFeilmelding("Velg et resultat før du fortsetter.");
          return;
        }
        if (
          erStegskjema &&
          manglerEndeligUtfallVedAvslutning(
            tillatteHandlinger.tilstand,
            valgtSteg as KontrollsakSteg,
            resultat,
          )
        ) {
          setFeilmelding("Velg endelig resultat før du flytter saken til Avsluttet.");
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
    if (felt.felt === "ytelser[].endeligBelop" && !skalViseEndeligBelop) return false;
    if (erStegskjema && !visResultatfeltForSteg && felt.datatype !== "belop") return false;
    return resultatFeltErAktivt(felt, skjemaverdier);
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
                  onChange={(verdi) => {
                    setValgtSteg(verdi as KontrollsakSteg);
                    setResultatverdier(
                      registrerteVerdierForMålsteg(tillatteHandlinger, verdi as KontrollsakSteg),
                    );
                  }}
                >
                  {hentVisbareSteg(tillatteHandlinger).map((steg) => (
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

              {erStegskjema && harResultatfelt && !resultatPåkrevd && (
                <Checkbox
                  checked={registrerResultat}
                  onChange={(event) => setRegistrerResultat(event.target.checked)}
                >
                  Registrer resultat fra gjeldende steg
                </Checkbox>
              )}

              {resultatPåkrevd && (
                <BodyShort>Registrer resultat før saken flyttes videre.</BodyShort>
              )}

              {visResultatfelt && (
                <VStack gap="space-12">
                  {aktiveResultatfelter.map((felt) => (
                    <ResultatFelt
                      key={felt.felt}
                      felt={felt}
                      tillatteHandlinger={tillatteHandlinger}
                      verdier={skjemaverdier}
                      onChange={(navn, verdi) =>
                        setResultatverdier((forrige) => ({ ...forrige, [navn]: verdi }))
                      }
                      tvungetVerdi={tvungneResultatverdierForSteg[felt.felt]}
                      belopPaakrevd={
                        overgangKreverBelop &&
                        skalViseEndeligBelop &&
                        paakrevdeFelterForOvergang.some((krav) => krav.startsWith(felt.felt))
                      }
                      tilSteg={erStegskjema && valgtSteg ? valgtSteg : undefined}
                    />
                  ))}
                </VStack>
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
                  : `Statusen endres til ${formaterValgtStatus(lesStatus(valgtStatus))}.`}
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
                Bekreft
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
