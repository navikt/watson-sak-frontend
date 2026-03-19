import { CogIcon } from "@navikt/aksel-icons";
import { BodyLong, Button, Modal, Radio, RadioGroup, Switch, VStack } from "@navikt/ds-react";
import type { Preferences } from "~/preferanser/PreferencesCookie";

interface InnstillingerModalProps {
  erApen: boolean;
  onClose: () => void;
  preferences: Preferences;
  onPreferenceChange: <K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
  ) => void | Promise<void>;
}

export function InnstillingerModal({
  erApen,
  onClose,
  preferences,
  onPreferenceChange,
}: InnstillingerModalProps) {
  return (
    <Modal
      open={erApen}
      onClose={onClose}
      closeOnBackdropClick={true}
      header={{
        heading: "Innstillinger",
        icon: <CogIcon aria-hidden />,
      }}
      width="medium"
    >
      <Modal.Body>
        <VStack gap="space-6">
          <BodyLong className="text-ax-text-neutral-subtle">
            Endringer lagres automatisk og gjelder med en gang.
          </BodyLong>

          <RadioGroup
            legend="Tema"
            value={preferences.tema}
            onChange={(value) => onPreferenceChange("tema", value)}
          >
            <Radio value="system">Følg systemet</Radio>
            <Radio value="light">Lyst tema</Radio>
            <Radio value="dark">Mørkt tema</Radio>
          </RadioGroup>

          <Switch
            checked={preferences.visVelkomstmelding}
            onChange={(event) => onPreferenceChange("visVelkomstmelding", event.target.checked)}
          >
            Vis velkomstmelding
          </Switch>
        </VStack>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onClose}>
          Lukk
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
