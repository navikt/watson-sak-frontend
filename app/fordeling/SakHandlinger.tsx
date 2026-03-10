import {
  ArrowForwardIcon,
  CheckmarkCircleIcon,
  PencilIcon,
  StarIcon,
  XMarkIcon,
} from "@navikt/aksel-icons";
import { ActionMenu } from "@navikt/ds-react";
import { useFetcher } from "react-router";
import { RouteConfig } from "~/routeConfig";

interface SakHandlingerProps {
  sakId: string;
}

/** Handlingsmeny for en sak – brukes både i listen og på detaljsiden */
export function SakHandlinger({ sakId }: SakHandlingerProps) {
  const fetcher = useFetcher();
  const actionUrl = RouteConfig.SAKER_DETALJ.replace(":sakId", sakId);

  function submit(data: Record<string, string>) {
    fetcher.submit(data, { method: "post", action: actionUrl });
  }

  return (
    <>
      <ActionMenu.Item
        onSelect={() =>
          submit({ handling: "endre_status", status: "tips avklart" })
        }
        icon={<StarIcon aria-hidden />}
      >
        Marker som prioritert
      </ActionMenu.Item>
      <ActionMenu.Item
        onSelect={() =>
          submit({ handling: "endre_status", status: "under utredning" })
        }
        icon={<CheckmarkCircleIcon aria-hidden />}
      >
        Send til plukkliste
      </ActionMenu.Item>
      <ActionMenu.Item
        onSelect={() =>
          submit({ handling: "endre_status", status: "avsluttet" })
        }
        icon={<XMarkIcon aria-hidden />}
      >
        Avvis
      </ActionMenu.Item>
      <ActionMenu.Divider />
      <ActionMenu.Group label="Tildel saksbehandler">
        <ActionMenu.Item
          onSelect={() =>
            submit({ handling: "tildel", saksbehandler: "Ola Nordmann" })
          }
          icon={<PencilIcon aria-hidden />}
        >
          Ola Nordmann
        </ActionMenu.Item>
        <ActionMenu.Item
          onSelect={() =>
            submit({ handling: "tildel", saksbehandler: "Kari Nordmann" })
          }
          icon={<PencilIcon aria-hidden />}
        >
          Kari Nordmann
        </ActionMenu.Item>
      </ActionMenu.Group>
      <ActionMenu.Divider />
      <ActionMenu.Group label="Videresend til seksjon">
        <ActionMenu.Item
          onSelect={() =>
            submit({ handling: "videresend_seksjon", seksjon: "Seksjon A" })
          }
          icon={<ArrowForwardIcon aria-hidden />}
        >
          Seksjon A
        </ActionMenu.Item>
        <ActionMenu.Item
          onSelect={() =>
            submit({ handling: "videresend_seksjon", seksjon: "Seksjon B" })
          }
          icon={<ArrowForwardIcon aria-hidden />}
        >
          Seksjon B
        </ActionMenu.Item>
        <ActionMenu.Item
          onSelect={() =>
            submit({ handling: "videresend_seksjon", seksjon: "Seksjon C" })
          }
          icon={<ArrowForwardIcon aria-hidden />}
        >
          Seksjon C
        </ActionMenu.Item>
      </ActionMenu.Group>
    </>
  );
}
