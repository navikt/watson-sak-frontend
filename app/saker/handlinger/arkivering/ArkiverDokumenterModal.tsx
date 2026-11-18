import { getFormProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { ArchiveIcon, ExclamationmarkTriangleIcon } from "@navikt/aksel-icons";
import {
  BodyShort,
  Button,
  Detail,
  InfoCard,
  Modal,
  Select,
  TextField,
  VStack,
} from "@navikt/ds-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useFetcher } from "react-router";
import { z } from "zod";
import { sporHendelse } from "~/analytics/analytics";
import { RouteConfig } from "~/routeConfig";
import type { OpprettetJournalpost } from "~/saker/arkiv/typer";
import type { DokumentNode, FilResponse } from "~/saker/filer/typer";
import { getSaksreferanse } from "~/saker/id";
import { type Tema, temaSkjema } from "../tema";
import { SuksessVisning } from "../SuksessVisning";
import { TemaVelger } from "../TemaVelger";
import { ArkivValgTre } from "./ArkivValgTre";
import { MAKS_ANTALL_VALGTE, alleElementer, byggArkivTre } from "./arkivvalg";
import { ANNEN_DOKUMENTBESKRIVELSE, dokumentbeskrivelser } from "./dokumentbeskrivelse";
import { journalførteDokumenter } from "./journalforte-dokumenter";

/** Det som er arkivert, slik at en oppgave kan knyttes til journalposten etterpå. */
export type ArkivertJournalpost = {
  journalpostId: string;
  tema: Tema;
  dokumentbeskrivelse: string;
  dokumentnavn: string[];
};

const arkiverSkjema = z
  .object({
    tema: temaSkjema,
    dokumentbeskrivelse: z
      .string({ error: "Velg dokumentbeskrivelse" })
      .min(1, "Velg dokumentbeskrivelse"),
    selvvalgtDokumentbeskrivelse: z.string().optional(),
    valgt: z
      .array(z.string())
      .min(1, "Velg minst én fil eller ett dokument")
      .max(MAKS_ANTALL_VALGTE, `Du kan velge maks ${MAKS_ANTALL_VALGTE} filer og dokumenter`),
  })
  .superRefine((data, ctx) => {
    if (
      data.dokumentbeskrivelse === ANNEN_DOKUMENTBESKRIVELSE &&
      !data.selvvalgtDokumentbeskrivelse?.trim()
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["selvvalgtDokumentbeskrivelse"],
        message: "Skriv en dokumentbeskrivelse",
      });
    }
  });

interface ArkiverDokumenterModalProps {
  sakId: string;
  åpen: boolean;
  onClose: () => void;
  /** Kalles når journalposten er opprettet, slik at den kan vises før Gosys har den. */
  onOpprettet?: (journalpost: OpprettetJournalpost) => void;
  /** Kalles når saksbehandleren vil knytte en oppgave til journalposten. */
  onKnyttTilOppgave: (journalpost: ArkivertJournalpost) => void;
  filer: FilResponse[];
  dokumenter: DokumentNode[];
}

export function ArkiverDokumenterModal({
  sakId,
  åpen,
  onClose,
  onOpprettet,
  onKnyttTilOppgave,
  filer,
  dokumenter,
}: ArkiverDokumenterModalProps) {
  const fetcher = useFetcher();
  const [valgteNøkler, settValgteNøkler] = useState<string[]>([]);
  const [arkivert, settArkivert] = useState<ArkivertJournalpost | null>(null);
  const ettDokument = arkivert?.dokumentnavn.length === 1;
  const [feilmelding, settFeilmelding] = useState<string | null>(null);
  const submitPågår = useRef(false);
  const innsendt = useRef<Omit<ArkivertJournalpost, "journalpostId"> | null>(null);
  const sporingsdata = useRef<Record<string, unknown>>({});

  const tre = useMemo(() => byggArkivTre(filer, dokumenter), [filer, dokumenter]);
  const elementer = useMemo(() => alleElementer(tre), [tre]);
  const steg = arkivert ? "suksess" : "skjema";

  const [form, fields] = useForm({
    id: "arkiver-dokumenter",
    constraint: getZodConstraint(arkiverSkjema),
    onValidate({ form: skjema, submitter, formData }) {
      const submission = parseWithZod(formData, { schema: arkiverSkjema });
      if (submitter && submission.status === "error") {
        fokuserUtvalgVedFeil(skjema, submission.error);
      }
      return submission;
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    onSubmit(event, { formData, submission }) {
      event.preventDefault();
      if (submission?.status !== "success") return;
      const { tema, dokumentbeskrivelse: valgtBeskrivelse, valgt } = submission.value;
      const valgte = elementer.filter((element) => valgt.includes(element.nøkkel));
      const beskrivelse =
        valgtBeskrivelse === ANNEN_DOKUMENTBESKRIVELSE
          ? (submission.value.selvvalgtDokumentbeskrivelse ?? "").trim()
          : valgtBeskrivelse;

      formData.set("handling", "opprett_journalpost");
      formData.set("tittel", beskrivelse);
      formData.delete("dokumentbeskrivelse");
      formData.delete("selvvalgtDokumentbeskrivelse");
      formData.delete("valgt");
      for (const element of valgte) {
        formData.append(element.type === "fil" ? "vedleggId" : "dokumentId", element.id);
      }

      sporingsdata.current = {
        antallFiler: valgte.filter((element) => element.type === "fil").length,
        antallDokumenter: valgte.filter((element) => element.type === "dokument").length,
        // Fast liste uten personopplysninger. Fritekst for «Annet» sendes ikke.
        dokumentbeskrivelse: valgtBeskrivelse,
      };
      submitPågår.current = true;
      innsendt.current = {
        tema,
        dokumentbeskrivelse: beskrivelse,
        dokumentnavn: valgte.map((element) => element.navn),
      };
      settFeilmelding(null);
      fetcher.submit(formData, {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId)),
      });
    },
  });

  function velg(nøkler: string[]) {
    // De skjulte feltene må være oppdatert før conform validerer utvalget på nytt.
    flushSync(() => settValgteNøkler(nøkler));
    if (fields.valgt.errors) form.validate({ name: fields.valgt.name });
  }

  function nullstill() {
    form.reset();
    settValgteNøkler([]);
    settArkivert(null);
    settFeilmelding(null);
  }

  function handleLukk() {
    if (fetcher.state !== "idle") return;
    nullstill();
    onClose();
  }

  function handleKnyttTilOppgave() {
    if (!arkivert) return;
    sporHendelse("journalpost knytt til oppgave klikket");
    nullstill();
    onKnyttTilOppgave(arkivert);
  }

  useEffect(() => {
    if (!submitPågår.current || fetcher.state !== "idle") return;
    submitPågår.current = false;

    const data: unknown = fetcher.data;
    const ok = typeof data === "object" && data !== null && "ok" in data && data.ok === true;
    if (!ok || !innsendt.current) {
      const feil =
        typeof data === "object" && data !== null && "feil" in data && typeof data.feil === "string"
          ? data.feil
          : null;
      settFeilmelding(feil ?? "Kunne ikke arkivere dokumentene i Gosys. Prøv igjen.");
      return;
    }
    const journalpostId =
      "journalpostId" in data && typeof data.journalpostId === "string" ? data.journalpostId : null;
    sporHendelse("journalpost opprettet", sporingsdata.current);
    onOpprettet?.({
      journalposttype: "NOTAT",
      tittel: innsendt.current.dokumentbeskrivelse,
      dokumenttitler: innsendt.current.dokumentnavn,
      journalpostId,
    });
    settArkivert({ ...innsendt.current, journalpostId: journalpostId ?? "" });
  }, [fetcher.data, fetcher.state, onOpprettet]);

  const senderInn = fetcher.state !== "idle";

  return (
    <Modal
      open={åpen}
      onClose={handleLukk}
      header={
        steg === "suksess"
          ? undefined
          : { heading: "Arkiver dokument(er) i Gosys", icon: <ArchiveIcon aria-hidden /> }
      }
      aria-label={
        steg === "suksess" ? "Dokumentene er arkivert i Gosys" : "Arkiver dokument(er) i Gosys"
      }
      width={steg === "skjema" ? "medium" : "small"}
    >
      {steg === "suksess" && <Modal.Header />}
      <fetcher.Form method="post" {...getFormProps(form)}>
        <Modal.Body>
          {steg === "skjema" ? (
            <VStack gap="space-24">
              <TemaVelger felt={fields.tema} />

              <VStack gap="space-16">
                <Select
                  key={fields.dokumentbeskrivelse.key}
                  name={fields.dokumentbeskrivelse.name}
                  id={fields.dokumentbeskrivelse.id}
                  label="Dokumentbeskrivelse"
                  defaultValue={fields.dokumentbeskrivelse.initialValue ?? ""}
                  error={fields.dokumentbeskrivelse.errors?.[0]}
                >
                  <option value="">Velg dokumentbeskrivelse</option>
                  {dokumentbeskrivelser.map((beskrivelse) => (
                    <option key={beskrivelse} value={beskrivelse}>
                      {beskrivelse}
                    </option>
                  ))}
                </Select>
                {fields.dokumentbeskrivelse.value === ANNEN_DOKUMENTBESKRIVELSE && (
                  <TextField
                    key={fields.selvvalgtDokumentbeskrivelse.key}
                    name={fields.selvvalgtDokumentbeskrivelse.name}
                    id={fields.selvvalgtDokumentbeskrivelse.id}
                    label="Selvvalgt dokumentbeskrivelse"
                    defaultValue={fields.selvvalgtDokumentbeskrivelse.initialValue}
                    error={fields.selvvalgtDokumentbeskrivelse.errors?.[0]}
                  />
                )}
              </VStack>

              {elementer.length > 0 ? (
                <ArkivValgTre
                  tre={tre}
                  name={fields.valgt.name}
                  valgte={valgteNøkler}
                  onChange={velg}
                  error={fields.valgt.errors?.[0]}
                />
              ) : (
                <VStack gap="space-4">
                  <BodyShort weight="semibold">Filer og dokumenter fra saken</BodyShort>
                  <Detail textColor="subtle">Ingen filer og dokumenter å velge blant.</Detail>
                  {fields.valgt.errors && (
                    <BodyShort size="small" className="text-ax-text-danger">
                      {fields.valgt.errors[0]}
                    </BodyShort>
                  )}
                </VStack>
              )}

              <InfoCard size="small" data-color="warning">
                <InfoCard.Header icon={<ExclamationmarkTriangleIcon aria-hidden />}>
                  <InfoCard.Title as="h3">Tilgang til dokumenter</InfoCard.Title>
                </InfoCard.Header>
                <InfoCard.Content>
                  Når du arkiverer og journalfører dokumentene i Gosys kan de ikke lenger åpnes og
                  redigeres i Watson sak. Word-filer blir arkivert som PDF.
                </InfoCard.Content>
              </InfoCard>

              {feilmelding && (
                <InfoCard size="small" data-color="danger">
                  <InfoCard.Message icon={<ExclamationmarkTriangleIcon aria-hidden />}>
                    {feilmelding}
                  </InfoCard.Message>
                </InfoCard>
              )}
            </VStack>
          ) : (
            <SuksessVisning
              tittel={`${ettDokument ? "Dokumentet" : "Dokumentene"} er arkivert og journalført i Gosys`}
              tekst={
                arkivert?.journalpostId
                  ? `Du kan knytte en oppgave til ${journalførteDokumenter(ettDokument)}.`
                  : undefined
              }
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          {steg === "skjema" ? (
            <>
              <Button type="submit" variant="primary" loading={senderInn} disabled={senderInn}>
                Arkiver
              </Button>
              <Button type="button" variant="secondary" onClick={handleLukk}>
                Avbryt
              </Button>
            </>
          ) : (
            <>
              {arkivert?.journalpostId && (
                <Button type="button" variant="secondary" onClick={handleKnyttTilOppgave}>
                  Knytt til oppgave
                </Button>
              )}
              <Button type="button" variant="secondary" onClick={handleLukk} autoFocus>
                Lukk
              </Button>
            </>
          )}
        </Modal.Footer>
      </fetcher.Form>
    </Modal>
  );
}

/**
 * Conform flytter fokus til første ugyldige felt, men utvalget sendes som skjulte felt som ikke kan
 * få fokus. Er utvalget eneste feil, flyttes fokus til første avkrysningsboks i stedet.
 */
function fokuserUtvalgVedFeil(
  skjema: HTMLFormElement,
  feil: Record<string, string[] | null> | null | undefined,
) {
  const feltMedFeil = Object.entries(feil ?? {})
    .filter(([, meldinger]) => meldinger?.length)
    .map(([felt]) => felt);
  if (feltMedFeil.length === 0 || feltMedFeil.some((felt) => felt !== "valgt")) return;
  requestAnimationFrame(() => {
    skjema.querySelector<HTMLInputElement>('input[type="checkbox"]:not(:disabled)')?.focus();
  });
}
