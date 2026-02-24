import {
  ArrowForwardIcon,
  CheckmarkCircleIcon,
  PencilIcon,
  StarIcon,
  XMarkIcon,
} from "@navikt/aksel-icons";
import { ActionMenu } from "@navikt/ds-react";

interface SakHandlingerProps {
  sakId: string;
}

/** Handlingsmeny for en sak – brukes både i listen og på detaljsiden */
export function SakHandlinger({ sakId }: SakHandlingerProps) {
  return (
    <>
      <ActionMenu.Item
        onSelect={() => alert(`Marker sak ${sakId} som prioritert`)}
        icon={<StarIcon aria-hidden />}
      >
        Marker som prioritert
      </ActionMenu.Item>
      <ActionMenu.Item
        onSelect={() => alert(`Send sak ${sakId} til plukkliste`)}
        icon={<CheckmarkCircleIcon aria-hidden />}
      >
        Send til plukkliste
      </ActionMenu.Item>
      <ActionMenu.Item
        onSelect={() => alert(`Avvis sak ${sakId}`)}
        icon={<XMarkIcon aria-hidden />}
      >
        Avvis
      </ActionMenu.Item>
      <ActionMenu.Divider />
      <ActionMenu.Group label="Tildel saksbehandler">
        <ActionMenu.Item
          onSelect={() => alert(`Tildel saksbehandler til sak ${sakId}`)}
          icon={<PencilIcon aria-hidden />}
        >
          Ola Nordmann
        </ActionMenu.Item>
        <ActionMenu.Item
          onSelect={() => alert(`Tildel saksbehandler til sak ${sakId}`)}
          icon={<PencilIcon aria-hidden />}
        >
          Kari Nordmann
        </ActionMenu.Item>
      </ActionMenu.Group>
      <ActionMenu.Divider />
      <ActionMenu.Group label="Videresend til seksjon">
        <ActionMenu.Item
          onSelect={() => alert(`Videresend sak ${sakId} til Seksjon A`)}
          icon={<ArrowForwardIcon aria-hidden />}
        >
          Seksjon A
        </ActionMenu.Item>
        <ActionMenu.Item
          onSelect={() => alert(`Videresend sak ${sakId} til Seksjon B`)}
          icon={<ArrowForwardIcon aria-hidden />}
        >
          Seksjon B
        </ActionMenu.Item>
        <ActionMenu.Item
          onSelect={() => alert(`Videresend sak ${sakId} til Seksjon C`)}
          icon={<ArrowForwardIcon aria-hidden />}
        >
          Seksjon C
        </ActionMenu.Item>
      </ActionMenu.Group>
    </>
  );
}
