import { getFormProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { DocPencilIcon } from "@navikt/aksel-icons";
import {
  Box,
  Button,
  Checkbox,
  FileUpload,
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
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import { OppgaveSkjema } from "./OppgaveSkjema";

const opprettJournalpostSkjema = z.object({
  journalposttype: z.string({ error: "Velg journalposttype" }).min(1, "Velg journalposttype"),
  tittel: z.string({ error: "Skriv en tittel" }).trim().min(1, "Skriv en tittel"),
  innhold: z.string({ error: "Skriv innhold" }).trim().min(1, "Skriv innhold"),
  knyttTilOppgave: z.string().optional(),
  oppgavetype: z.string().optional(),
  prioritet: z.string().optional(),
  frist: z.string().optional(),
  behandlendeEnhet: z.string().optional(),
  beskrivelse: z.string().optional(),
});

interface OpprettJournalpostModalProps {
  sakId: string;
  åpen: boolean;
  onClose: () => void;
}

export function OpprettJournalpostModal({ sakId, åpen, onClose }: OpprettJournalpostModalProps) {
  const fetcher = useFetcher();
  const [knyttTilOppgave, setKnyttTilOppgave] = useState(false);
  const [filer, setFiler] = useState<File[]>([]);

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
      fetcher.submit(formData, {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId)),
      });
      form.reset();
      setKnyttTilOppgave(false);
      setFiler([]);
      onClose();
    },
  });

  function handleLukk() {
    form.reset();
    setKnyttTilOppgave(false);
    setFiler([]);
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

            <VStack gap="space-4">
              <FileUpload.Dropzone
                label="Last opp vedlegg (valgfritt)"
                description="Maks 50 MB per fil."
                accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx"
                onSelect={(_, partitioned) =>
                  setFiler((eksisterende) => [...eksisterende, ...partitioned.accepted])
                }
              />
              {filer.length > 0 && (
                <VStack gap="space-4" as="ul" aria-label="Opplastede filer">
                  {filer.map((fil, indeks) => (
                    <FileUpload.Item
                      key={`${fil.name}-${indeks}`}
                      as="li"
                      file={fil}
                      button={{
                        action: "delete",
                        onClick: () =>
                          setFiler((eksisterende) => eksisterende.filter((_, i) => i !== indeks)),
                      }}
                    />
                  ))}
                </VStack>
              )}
            </VStack>

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
