import { getFormProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import {
  CheckmarkCircleFillIcon,
  DocPencilIcon,
  ExclamationmarkTriangleIcon,
} from "@navikt/aksel-icons";
import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  BodyShort,
  Detail,
  HGrid,
  InfoCard,
  Modal,
  Radio,
  RadioGroup,
  TextField,
  Textarea,
  VStack,
} from "@navikt/ds-react";
import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { z } from "zod";
import { sporHendelse } from "~/analytics/analytics";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import type { DokumentNode, FilResponse } from "~/saker/filer/typer";
import { formaterStorrelse } from "~/utils/number-utils";
import { formaterDato } from "~/utils/date-utils";
import { OppgaveSkjema } from "./OppgaveSkjema";

/** Kombinert grense for antall filer og dokumenter som til sammen kan velges for arkivering. */
const MAKS_ANTALL_VALGTE_ELEMENTER = 10;
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

function formaterJournalposttype(type: string): string {
  const etiketter: Record<string, string> = {
    INNGAAENDE: "Inngående",
    UTGAAENDE: "Utgående",
    NOTAT: "Notat",
  };
  return etiketter[type] ?? type;
}

function formaterOppgavetype(type: string): string {
  const etiketter: Record<string, string> = {
    VUR: "Vurder dokument",
    VURD_HENV: "Vurder henvendelse",
    VUR_KONS_YTE: "Vurder konsekvens for ytelse",
  };
  return etiketter[type] ?? type;
}

function formaterOppgavePrioritet(prioritet: string): string {
  const etiketter: Record<string, string> = {
    LAV: "Lav",
    NORMAL: "Normal",
    HOY: "Høy",
  };
  return etiketter[prioritet] ?? prioritet;
}

/** Ett valgbart element i journalpost-modalen — enten en opplastet fil eller et Watson Sak-dokument. */
type ValgbartElement =
  | { nøkkel: string; type: "fil"; id: string; navn: string; storrelse: number }
  | { nøkkel: string; type: "dokument"; id: string; navn: string };

const opprettJournalpostSkjema = z
  .object({
    journalposttype: z.string({ error: "Velg journalposttype" }).min(1, "Velg journalposttype"),
    tittel: z.string({ error: "Skriv en tittel" }).trim().min(1, "Skriv en tittel"),
    innhold: z.string({ error: "Skriv innhold" }).trim().min(1, "Skriv innhold"),
    knyttTilOppgave: z.string().optional(),
    oppgavetype: z.string().optional(),
    prioritet: z.string().optional(),
    frist: z.string().optional(),
    behandlendeEnhet: z.string().optional(),
    beskrivelse: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.knyttTilOppgave !== "true") return;

    if (!data.oppgavetype) {
      ctx.addIssue({ code: "custom", path: ["oppgavetype"], message: "Velg oppgavetype" });
    }
    if (!data.prioritet) {
      ctx.addIssue({ code: "custom", path: ["prioritet"], message: "Velg prioritet" });
    }
    if (!data.frist) {
      ctx.addIssue({ code: "custom", path: ["frist"], message: "Velg frist" });
    }
    if (!data.behandlendeEnhet) {
      ctx.addIssue({
        code: "custom",
        path: ["behandlendeEnhet"],
        message: "Velg behandlende enhet",
      });
    }
    if (!data.beskrivelse?.trim()) {
      ctx.addIssue({ code: "custom", path: ["beskrivelse"], message: "Skriv en beskrivelse" });
    }
  });

interface OpprettJournalpostModalProps {
  sakId: string;
  åpen: boolean;
  onClose: () => void;
  /** PDF-filer lastet opp på saken som kan velges som vedlegg. */
  filer: FilResponse[];
  /** Dokumenter opprettet i Watson Sak som kan velges for arkivering (konverteres til PDF). */
  dokumenter: DokumentNode[];
}

export function OpprettJournalpostModal({
  sakId,
  åpen,
  onClose,
  filer,
  dokumenter,
}: OpprettJournalpostModalProps) {
  const fetcher = useFetcher();
  const [knyttTilOppgave, setKnyttTilOppgave] = useState(false);
  const [valgteNøkler, setValgteNøkler] = useState<string[]>([]);
  const submitPågår = useRef(false);
  const forrigeÅpen = useRef(false);
  const [steg, setSteg] = useState<Steg>("skjema");
  const [innsendingFormData, setInnsendingFormData] = useState<FormData | null>(null);
  const [feilmelding, setFeilmelding] = useState<string | null>(null);

  const valgbareElementer: ValgbartElement[] = [
    ...filer
      .filter((fil) => fil.contentType === "application/pdf" && !fil.arkivert)
      .map(
        (fil): ValgbartElement => ({
          nøkkel: `fil:${fil.id}`,
          type: "fil",
          id: fil.id,
          navn: fil.filnavn,
          storrelse: fil.storrelse,
        }),
      ),
    ...dokumenter
      .filter((dokument) => !dokument.arkivert)
      .map(
        (dokument): ValgbartElement => ({
          nøkkel: `dokument:${dokument.id}`,
          type: "dokument",
          id: dokument.id,
          navn: dokument.tittel,
        }),
      ),
  ];

  const [form, fields] = useForm({
    id: "opprett-journalpost",
    constraint: getZodConstraint(opprettJournalpostSkjema),
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: opprettJournalpostSkjema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    onSubmit(event, { formData }) {
      event.preventDefault();
      formData.set("handling", "opprett_journalpost");
      valgteNøkler.forEach((nøkkel) => {
        const [type, id] = nøkkel.split(":");
        formData.append(type === "fil" ? "vedleggId" : "dokumentId", id);
      });
      sporHendelse("journalpost bekreftelse vist", {
        medOppgave: knyttTilOppgave,
      });
      setFeilmelding(null);
      setInnsendingFormData(formData);
      setSteg("bekreft");
    },
  });

  function handleBekreft() {
    if (!innsendingFormData) return;
    sporHendelse("journalpost opprettet", { medOppgave: knyttTilOppgave });
    submitPågår.current = true;
    fetcher.submit(innsendingFormData, {
      method: "post",
      action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId)),
    });
  }

  function handleAvbrytBekreftelse() {
    sporHendelse("journalpost avbrutt i bekreftelse");
    setSteg("skjema");
  }

  function nullstill() {
    form.reset();
    setKnyttTilOppgave(false);
    setValgteNøkler([]);
    setSteg("skjema");
    setInnsendingFormData(null);
    setFeilmelding(null);
  }

  function handleLukk() {
    if (fetcher.state !== "idle") return;
    nullstill();
    onClose();
  }

  useEffect(() => {
    if (åpen && !forrigeÅpen.current) {
      setSteg("skjema");
      setInnsendingFormData(null);
      setFeilmelding(null);
    }
    forrigeÅpen.current = åpen;
  }, [åpen]);

  useEffect(() => {
    if (!submitPågår.current || fetcher.state !== "idle") return;

    if (fetcher.data && "ok" in fetcher.data && fetcher.data.ok) {
      setFeilmelding(null);
      setSteg("suksess");
    } else {
      setFeilmelding("Kunne ikke opprette journalpost. Prøv igjen.");
      setSteg("bekreft");
    }
    submitPågår.current = false;
  }, [fetcher.data, fetcher.state]);

  const journalpostFormData = innsendingFormData;
  const oppgaveFormData = innsendingFormData && knyttTilOppgave ? innsendingFormData : null;

  return (
    <Modal
      open={åpen}
      onClose={handleLukk}
      closeOnBackdropClick
      header={
        steg === "suksess"
          ? undefined
          : { heading: "Opprett journalpost", icon: <DocPencilIcon aria-hidden /> }
      }
      aria-label={steg === "suksess" ? "Journalpost opprettet" : "Opprett journalpost"}
      width={steg === "skjema" ? "medium" : "small"}
    >
      {steg === "suksess" && <Modal.Header />}
      <fetcher.Form method="post" {...getFormProps(form)} name="opprett-journalpost">
        <Modal.Body>
          {steg === "skjema" && (
            <VStack gap="space-4">
              <RadioGroup
                key={fields.journalposttype.key}
                name={fields.journalposttype.name}
                legend="Journalposttype"
                error={fields.journalposttype.errors?.[0]}
                defaultValue={fields.journalposttype.initialValue ?? ""}
              >
                <Radio value="INNGAAENDE">Inngående</Radio>
                <Radio value="UTGAAENDE">Utgående</Radio>
                <Radio value="NOTAT">Notat</Radio>
              </RadioGroup>

              <TextField
                key={fields.tittel.key}
                name={fields.tittel.name}
                defaultValue={fields.tittel.initialValue}
                label="Tittel"
                error={fields.tittel.errors?.[0]}
              />

              <Textarea
                key={fields.innhold.key}
                name={fields.innhold.name}
                defaultValue={fields.innhold.initialValue}
                label="Innhold"
                error={fields.innhold.errors?.[0]}
                minRows={4}
                maxRows={10}
              />

              {valgbareElementer.length > 0 ? (
                <CheckboxGroup
                  legend="Filer og dokumenter fra saken (valgfritt)"
                  description={`Velg filer og dokumenter som skal arkiveres sammen med journalposten. Maks ${MAKS_ANTALL_VALGTE_ELEMENTER} totalt.`}
                  value={valgteNøkler}
                  onChange={setValgteNøkler}
                >
                  {valgbareElementer.map((element) => {
                    const kanVelges =
                      valgteNøkler.includes(element.nøkkel) ||
                      valgteNøkler.length < MAKS_ANTALL_VALGTE_ELEMENTER;
                    return (
                      <Checkbox key={element.nøkkel} value={element.nøkkel} disabled={!kanVelges}>
                        <BodyShort size="small" as="span">
                          {element.navn}
                        </BodyShort>
                        {element.type === "fil" && (
                          <Detail as="span" className="ml-2 text-ax-text-neutral-subtle">
                            ({formaterStorrelse(element.storrelse)})
                          </Detail>
                        )}
                      </Checkbox>
                    );
                  })}
                </CheckboxGroup>
              ) : (
                <Detail className="text-ax-text-neutral-subtle">
                  Ingen filer eller dokumenter å velge blant.
                </Detail>
              )}

              <VStack gap="space-2">
                <input
                  name={fields.knyttTilOppgave.name}
                  value={knyttTilOppgave ? "true" : "false"}
                  hidden
                  readOnly
                />
                <Checkbox
                  checked={knyttTilOppgave}
                  onChange={(e) => setKnyttTilOppgave(e.target.checked)}
                >
                  Opprett og knytt til oppgave
                </Checkbox>

                {knyttTilOppgave && (
                  <Box
                    background="sunken"
                    borderWidth="1 0"
                    borderColor="neutral-subtle"
                    className="-mx-7 px-7 py-4"
                  >
                    <OppgaveSkjema
                      fields={{
                        oppgavetype: fields.oppgavetype,
                        prioritet: fields.prioritet,
                        frist: fields.frist,
                        behandlendeEnhet: fields.behandlendeEnhet,
                        beskrivelse: fields.beskrivelse,
                      }}
                    />
                  </Box>
                )}
              </VStack>
            </VStack>
          )}
          {steg === "bekreft" && journalpostFormData && (
            <VStack gap="space-16">
              <BodyShort>Du oppretter nå:</BodyShort>
              <VStack gap="space-8">
                <Box background="neutral-soft" padding="space-16" borderRadius="8">
                  <BodyShort weight="semibold" spacing>
                    Journalpost
                  </BodyShort>
                  <HGrid columns="auto 1fr" gap="space-4 space-16">
                    <SammendragRad
                      label="Type"
                      verdi={formaterJournalposttype(
                        journalpostFormData.get("journalposttype")?.toString() ?? "",
                      )}
                    />
                    <SammendragRad
                      label="Tittel"
                      verdi={journalpostFormData.get("tittel")?.toString() ?? ""}
                    />
                    <SammendragRad
                      label="Innhold"
                      verdi={journalpostFormData.get("innhold")?.toString() ?? ""}
                    />
                  </HGrid>
                </Box>
                {oppgaveFormData && (
                  <Box background="neutral-soft" padding="space-16" borderRadius="8">
                    <BodyShort weight="semibold" spacing>
                      Oppgave
                    </BodyShort>
                    <HGrid columns="auto 1fr" gap="space-4 space-16">
                      <SammendragRad
                        label="Type"
                        verdi={formaterOppgavetype(
                          oppgaveFormData.get("oppgavetype")?.toString() ?? "",
                        )}
                      />
                      <SammendragRad
                        label="Prioritet"
                        verdi={formaterOppgavePrioritet(
                          oppgaveFormData.get("prioritet")?.toString() ?? "",
                        )}
                      />
                      <SammendragRad
                        label="Frist"
                        verdi={formaterDato(oppgaveFormData.get("frist")?.toString() ?? "")}
                      />
                      <SammendragRad
                        label="Behandlende enhet"
                        verdi={oppgaveFormData.get("behandlendeEnhet")?.toString() ?? ""}
                      />
                      <SammendragRad
                        label="Beskrivelse"
                        verdi={oppgaveFormData.get("beskrivelse")?.toString() ?? ""}
                      />
                    </HGrid>
                  </Box>
                )}
              </VStack>
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
                <BodyShort weight="semibold">
                  {knyttTilOppgave ? "Journalpost og oppgave opprettet" : "Journalpost opprettet"}
                </BodyShort>
                <BodyShort textColor="subtle">
                  {knyttTilOppgave
                    ? "Journalposten og oppgaven er opprettet og lagret på saken."
                    : "Journalposten er opprettet og lagret på saken."}
                </BodyShort>
              </VStack>
            </VStack>
          )}
        </Modal.Body>
        <Modal.Footer>
          {steg === "skjema" && (
            <>
              <Button type="submit" variant="primary" disabled={fetcher.state !== "idle"}>
                Lagre
              </Button>
              <Button type="button" variant="secondary" onClick={handleLukk}>
                Avbryt
              </Button>
            </>
          )}
          {steg === "bekreft" && (
            <>
              <Button type="button" variant="secondary" onClick={handleAvbrytBekreftelse}>
                Avbryt
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleBekreft}
                loading={fetcher.state !== "idle"}
                disabled={fetcher.state !== "idle"}
              >
                Opprett
              </Button>
            </>
          )}
          {steg === "suksess" && (
            <Button type="button" variant="primary" onClick={handleLukk}>
              Lukk
            </Button>
          )}
        </Modal.Footer>
      </fetcher.Form>
    </Modal>
  );
}
