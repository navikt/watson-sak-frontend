import { PlusIcon } from "@navikt/aksel-icons";
import {
  Button,
  DatePicker,
  HStack,
  Modal,
  Textarea,
  TextField,
  useDatepicker,
  VStack,
} from "@navikt/ds-react";
import { useRef, useState } from "react";
import { useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";

interface LeggTilHistorikkModalProps {
  sakId: string;
  åpen: boolean;
  onClose: () => void;
}

function standardDato(): string {
  const nå = new Date();
  const dag = String(nå.getDate()).padStart(2, "0");
  const måned = String(nå.getMonth() + 1).padStart(2, "0");
  const år = nå.getFullYear();
  return `${dag}.${måned}.${år}`;
}

function standardTid(): string {
  const nå = new Date();
  return `${String(nå.getHours()).padStart(2, "0")}:${String(nå.getMinutes()).padStart(2, "0")}`;
}

export function LeggTilHistorikkModal({ sakId, åpen, onClose }: LeggTilHistorikkModalProps) {
  const modalRef = useRef<HTMLDialogElement>(null);
  const fetcher = useFetcher();
  const [dato, setDato] = useState(standardDato);
  const [tid, setTid] = useState(standardTid);

  const { datepickerProps, inputProps } = useDatepicker({
    defaultSelected: new Date(),
    onDateChange: (val) => {
      if (!val) return;
      const dag = String(val.getDate()).padStart(2, "0");
      const måned = String(val.getMonth() + 1).padStart(2, "0");
      const år = val.getFullYear();
      setDato(`${dag}.${måned}.${år}`);
    },
  });

  function handleLagre(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("handling", "legg_til_historikk");
    formData.set("dato", dato);
    fetcher.submit(formData, {
      method: "post",
      action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId)),
    });
    onClose();
  }

  return (
    <Modal
      ref={modalRef}
      open={åpen}
      onClose={onClose}
      header={{ heading: "Legg til historikkinnslag", icon: <PlusIcon aria-hidden /> }}
      width="medium"
    >
      <form onSubmit={handleLagre}>
        <Modal.Body>
          <VStack gap="space-4">
            <TextField name="tittel" label="Tittel" autoComplete="off" required />
            <Textarea name="notat" label="Beskrivelse" maxLength={500} />
            <DatePicker {...datepickerProps}>
              <HStack gap="space-4" align="end">
                <DatePicker.Input
                  {...inputProps}
                  label="Dato"
                  value={dato}
                  onChange={(e) => {
                    inputProps.onChange?.(e);
                    setDato(e.target.value);
                  }}
                />
                <TextField
                  name="tid"
                  label="Klokkeslett"
                  type="time"
                  value={tid}
                  onChange={(e) => setTid(e.target.value)}
                />
              </HStack>
            </DatePicker>
          </VStack>
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" variant="primary">
            Lagre
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Avbryt
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
