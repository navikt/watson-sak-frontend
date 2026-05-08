import { getFormProps, useForm, useInputControl } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { DocPencilIcon } from "@navikt/aksel-icons";
import {
  Box,
  Button,
  Checkbox,
  DatePicker,
  HStack,
  Label,
  Modal,
  Select,
  Textarea,
  UNSAFE_Combobox,
  useDatepicker,
  VStack,
} from "@navikt/ds-react";
import { useState } from "react";
import { useFetcher } from "react-router";
import { z } from "zod";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import { behandlendeEnheter } from "./behandlendeEnheter";
import { notatMalValg } from "./notatValg";

const opprettNotatSkjema = z.object({
  notat: z.string({ error: "Skriv et notat" }).trim().min(1, "Skriv et notat"),
  mal: z.string().optional(),
  knyttTilOppgave: z.string().optional(),
  oppgavetype: z.string().optional(),
  prioritet: z.string().optional(),
  frist: z.string().optional(),
  behandlendeEnhet: z.string().optional(),
  beskrivelse: z.string().optional(),
});

interface OpprettNotatModalProps {
  sakId: string;
  åpen: boolean;
  onClose: () => void;
}

const oppgavetypeValg = [
  { verdi: "vurder_dokument", label: "Vurder dokument" },
  { verdi: "vurder_henvendelse", label: "Vurder henvendelse" },
  { verdi: "vurder_konsekvens", label: "Vurder konsekvens for ytelse" },
];

export function OpprettNotatModal({ sakId, åpen, onClose }: OpprettNotatModalProps) {
  const fetcher = useFetcher();

  const [form, fields] = useForm({
    id: "opprett-notat",
    constraint: getZodConstraint(opprettNotatSkjema),
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: opprettNotatSkjema });
    },
    shouldValidate: "onBlur",
    shouldRevalidate: "onInput",
    onSubmit(event, { formData }) {
      event.preventDefault();
      formData.set("handling", "send_notat");
      const oppgavetypeVerdi = formData.get("oppgavetype") as string;
      if (oppgavetypeVerdi) {
        const oppgavetypeLabel =
          oppgavetypeValg.find((v) => v.verdi === oppgavetypeVerdi)?.label ?? oppgavetypeVerdi;
        formData.set("oppgavetype", oppgavetypeLabel);
      }
      fetcher.submit(formData, {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId)),
      });
      form.reset();
      onClose();
    },
  });

  const [knyttTilOppgave, setKnyttTilOppgave] = useState(false);
  const frist = useInputControl(fields.frist);
  const behandlendeEnhet = useInputControl(fields.behandlendeEnhet);

  const { datepickerProps, inputProps } = useDatepicker({
    fromDate: new Date(),
    onDateChange: (date) => {
      frist.change(date ? date.toISOString().split("T")[0] : "");
    },
  });

  function handleLukk() {
    form.reset();
    setKnyttTilOppgave(false);
    onClose();
  }

  const valgtBehandlendeEnhet = behandlendeEnheter.find(
    (enhet) => enhet.value === behandlendeEnhet.value,
  );

  return (
    <Modal
      open={åpen}
      onClose={handleLukk}
      header={{ heading: "Opprett notat", icon: <DocPencilIcon aria-hidden /> }}
      width="medium"
    >
      <fetcher.Form method="post" {...getFormProps(form)}>
        <Modal.Body>
          <VStack gap="space-4">
            <div>
              <Label size="small">TEMA</Label>
              <p className="mt-0.5 text-medium">Kontroll</p>
            </div>

            <Select
              key={fields.mal.key}
              name={fields.mal.name}
              id={fields.mal.id}
              defaultValue={fields.mal.initialValue ?? ""}
              label="Mal"
            >
              <option value="">Velg mal</option>
              {notatMalValg.map(({ verdi, label }) => (
                <option key={verdi} value={verdi}>
                  {label}
                </option>
              ))}
            </Select>

            <Textarea
              key={fields.notat.key}
              name={fields.notat.name}
              defaultValue={fields.notat.initialValue}
              label="Notat"
              error={fields.notat.errors?.[0]}
              minRows={4}
              maxRows={10}
            />

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
                  borderRadius="8 8 0 0"
                  borderWidth="1"
                  borderColor="neutral-subtle"
                  className="-mx-5 px-5 py-4"
                >
                  <VStack gap="space-4">
                    <Select
                      key={fields.oppgavetype.key}
                      name={fields.oppgavetype.name}
                      id={fields.oppgavetype.id}
                      defaultValue={fields.oppgavetype.initialValue ?? ""}
                      label="Oppgavetype"
                    >
                      <option value="">Velg oppgavetype</option>
                      {oppgavetypeValg.map(({ verdi, label }) => (
                        <option key={verdi} value={verdi}>
                          {label}
                        </option>
                      ))}
                    </Select>

                    <HStack gap="space-4" align="start">
                      <Select
                        key={fields.prioritet.key}
                        name={fields.prioritet.name}
                        id={fields.prioritet.id}
                        defaultValue={fields.prioritet.initialValue ?? ""}
                        label="Prioritet"
                        className="flex-1"
                      >
                        <option value="">Velg prioritet</option>
                        <option value="LAV">Lav</option>
                        <option value="NORMAL">Normal</option>
                        <option value="HOY">Høy</option>
                      </Select>

                      <input
                        name={fields.frist.name}
                        defaultValue={fields.frist.initialValue}
                        hidden
                        tabIndex={-1}
                        onFocus={() => frist.focus()}
                      />
                      <DatePicker {...datepickerProps}>
                        <DatePicker.Input {...inputProps} label="Frist" className="flex-1" />
                      </DatePicker>
                    </HStack>

                    <input
                      name={fields.behandlendeEnhet.name}
                      defaultValue={fields.behandlendeEnhet.initialValue}
                      hidden
                      tabIndex={-1}
                      onFocus={() => behandlendeEnhet.focus()}
                    />
                    <UNSAFE_Combobox
                      label="Behandlende enhet"
                      options={behandlendeEnheter}
                      placeholder="Søk etter enhet"
                      selectedOptions={valgtBehandlendeEnhet ? [valgtBehandlendeEnhet] : []}
                      onToggleSelected={(enhetsnummer, isSelected) =>
                        behandlendeEnhet.change(isSelected ? enhetsnummer : "")
                      }
                    />

                    <Textarea
                      key={fields.beskrivelse.key}
                      name={fields.beskrivelse.name}
                      defaultValue={fields.beskrivelse.initialValue}
                      label="Beskrivelse"
                      minRows={2}
                      maxRows={5}
                    />
                  </VStack>
                </Box>
              )}
            </VStack>
          </VStack>
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" variant="primary">
            Lagre
          </Button>
          <Button type="button" variant="secondary" onClick={handleLukk}>
            Avbryt
          </Button>
        </Modal.Footer>
      </fetcher.Form>
    </Modal>
  );
}
