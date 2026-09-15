import { CogIcon } from "@navikt/aksel-icons";
import { BodyLong, Button, Modal, Radio, RadioGroup, Switch, VStack } from "@navikt/ds-react";
import { sporHendelse } from "~/analytics/analytics";
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
  function sporOgEndrePreferanse<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    sporHendelse("innstillinger endret", { innstilling: key, verdi: value });
    onPreferenceChange(key, value);
  }

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
            onChange={(value) => sporOgEndrePreferanse("tema", value)}
          >
            <Radio value="system">Følg systemet</Radio>
            <Radio value="light">Lyst tema</Radio>
            <Radio value="dark">Mørkt tema</Radio>
          </RadioGroup>

          <Switch
            checked={preferences.visVelkomstmelding}
            onChange={(event) => sporOgEndrePreferanse("visVelkomstmelding", event.target.checked)}
          >
            Vis velkomstmelding
          </Switch>

          <VStack gap="space-2">
            <Switch
              checked={preferences.visInfopaneler}
              onChange={(event) => sporOgEndrePreferanse("visInfopaneler", event.target.checked)}
            >
              Vis informasjonspaneler
            </Switch>
            <BodyLong size="small" className="text-ax-text-neutral-subtle">
              Få veiledning om funksjoner du møter i Watson Sak.
            </BodyLong>
          </VStack>
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
