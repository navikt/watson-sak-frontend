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
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";
import { behandlendeEnheter } from "./behandlendeEnheter";
import { notatMalValg } from "./notatValg";

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
  const [mal, setMal] = useState("");
  const [notat, setNotat] = useState("");
  const [knyttTilOppgave, setKnyttTilOppgave] = useState(false);
  const [oppgavetype, setOppgavetype] = useState("");
  const [prioritet, setPrioritet] = useState("");
  const [behandlendeEnhet, setBehandlendeEnhet] = useState("");
  const [beskrivelse, setBeskrivelse] = useState("");

  const [frist, setFrist] = useState<Date | undefined>(undefined);
  const { datepickerProps, inputProps } = useDatepicker({
    fromDate: new Date(),
    onDateChange: setFrist,
  });

  function handleLukk() {
    nullstill();
    onClose();
  }

  function nullstill() {
    setMal("");
    setNotat("");
    setKnyttTilOppgave(false);
    setOppgavetype("");
    setPrioritet("");
    setFrist(undefined);
    setBehandlendeEnhet("");
    setBeskrivelse("");
  }

  function handleLagre() {
    const oppgavetypeLabel =
      oppgavetypeValg.find((v) => v.verdi === oppgavetype)?.label ?? oppgavetype;
    fetcher.submit(
      {
        handling: "send_notat",
        notat: notat.trim(),
        mal,
        knyttTilOppgave: String(knyttTilOppgave),
        oppgavetype: oppgavetypeLabel,
        prioritet,
        frist: frist ? frist.toISOString().split("T")[0] : "",
        behandlendeEnhet,
        beskrivelse,
      },
      {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId)),
      },
    );
    nullstill();
    onClose();
  }

  const kanLagre = notat.trim().length > 0;
  const valgtBehandlendeEnhet = behandlendeEnheter.find(
    (enhet) => enhet.value === behandlendeEnhet,
  );

  return (
    <Modal
      open={åpen}
      onClose={handleLukk}
      header={{ heading: "Opprett notat", icon: <DocPencilIcon aria-hidden /> }}
      width="medium"
    >
      <Modal.Body>
        <VStack gap="space-4">
          <div>
            <Label size="small">TEMA</Label>
            <p className="mt-0.5 text-medium">Kontroll</p>
          </div>

          <Select label="Mal" value={mal} onChange={(e) => setMal(e.target.value)}>
            <option value="">Velg mal</option>
            {notatMalValg.map(({ verdi, label }) => (
              <option key={verdi} value={verdi}>
                {label}
              </option>
            ))}
          </Select>

          <Textarea
            label="Notat"
            value={notat}
            onChange={(e) => setNotat(e.target.value)}
            minRows={4}
            maxRows={10}
          />

          <VStack gap="space-2">
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
                    label="Oppgavetype"
                    value={oppgavetype}
                    onChange={(e) => setOppgavetype(e.target.value)}
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
                      label="Prioritet"
                      value={prioritet}
                      onChange={(e) => setPrioritet(e.target.value)}
                      className="flex-1"
                    >
                      <option value="">Velg prioritet</option>
                      <option value="LAV">Lav</option>
                      <option value="NORMAL">Normal</option>
                      <option value="HOY">Høy</option>
                    </Select>

                    <DatePicker {...datepickerProps}>
                      <DatePicker.Input {...inputProps} label="Frist" className="flex-1" />
                    </DatePicker>
                  </HStack>

                  <UNSAFE_Combobox
                    label="Behandlende enhet"
                    options={behandlendeEnheter}
                    placeholder="Søk etter enhet"
                    selectedOptions={valgtBehandlendeEnhet ? [valgtBehandlendeEnhet] : []}
                    onToggleSelected={(enhetsnummer, isSelected) =>
                      setBehandlendeEnhet(isSelected ? enhetsnummer : "")
                    }
                  />

                  <Textarea
                    label="Beskrivelse"
                    value={beskrivelse}
                    onChange={(e) => setBeskrivelse(e.target.value)}
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
        <Button variant="primary" onClick={handleLagre} disabled={!kanLagre}>
          Lagre
        </Button>
        <Button variant="secondary" onClick={handleLukk}>
          Avbryt
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
