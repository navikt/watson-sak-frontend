import { getFormProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { DocPencilIcon } from "@navikt/aksel-icons";
import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  BodyShort,
  Detail,
  Modal,
  Radio,
  RadioGroup,
  TextField,
  Textarea,
  VStack,
} from "@navikt/ds-react";
import { useState } from "react";
import { useFetcher } from "react-router";
import { z } from "zod";
import { sporHendelse } from "~/analytics/analytics";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import type { FilResponse } from "~/saker/filer/typer";
import { OppgaveSkjema } from "./OppgaveSkjema";

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
}

export function OpprettJournalpostModal({
  sakId,
  åpen,
  onClose,
  filer,
}: OpprettJournalpostModalProps) {
  const fetcher = useFetcher();
  const [knyttTilOppgave, setKnyttTilOppgave] = useState(false);
  const [valgteVedleggIds, setValgteVedleggIds] = useState<string[]>([]);

  const pdfFiler = filer.filter((fil) => fil.contentType === "application/pdf");

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
      valgteVedleggIds.forEach((id) => formData.append("vedleggId", id));
      sporHendelse("journalpost opprettet");
      fetcher.submit(formData, {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId)),
      });
      form.reset();
      setKnyttTilOppgave(false);
      setValgteVedleggIds([]);
      onClose();
    },
  });

  function handleLukk() {
    form.reset();
    setKnyttTilOppgave(false);
    setValgteVedleggIds([]);
    onClose();
  }

  return (
    <Modal
      open={åpen}
      onClose={handleLukk}
      closeOnBackdropClick
      header={{ heading: "Opprett journalpost", icon: <DocPencilIcon aria-hidden /> }}
      width="medium"
    >
      <Modal.Body>
        <fetcher.Form method="post" {...getFormProps(form)} name="opprett-journalpost">
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

            {pdfFiler.length > 0 ? (
              <CheckboxGroup
                legend="Vedlegg fra saken (valgfritt)"
                description="Kun PDF-filer kan legges ved. Velg filer som skal arkiveres sammen med journalposten."
                value={valgteVedleggIds}
                onChange={setValgteVedleggIds}
              >
                {pdfFiler.map((fil) => (
                  <Checkbox key={fil.id} value={fil.id}>
                    <BodyShort size="small" as="span">
                      {fil.filnavn}
                    </BodyShort>
                    <Detail as="span" className="ml-2 text-ax-text-neutral-subtle">
                      ({formaterStorrelse(fil.storrelse)})
                    </Detail>
                  </Checkbox>
                ))}
              </CheckboxGroup>
            ) : (
              <Detail className="text-ax-text-neutral-subtle">
                Ingen PDF-filer lastet opp på saken ennå.
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
                Knytt til oppgave
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
        </fetcher.Form>
      </Modal.Body>
      <Modal.Footer>
        <Button type="submit" form="opprett-journalpost" variant="primary">
          Lagre
        </Button>
        <Button type="button" variant="secondary" onClick={handleLukk}>
          Avbryt
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

function formaterStorrelse(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
