import { GlobalAlert } from "@navikt/ds-react";
import {
  GlobalAlertCloseButton,
  GlobalAlertContent,
  GlobalAlertHeader,
  GlobalAlertTitle,
} from "@navikt/ds-react/GlobalAlert";
import { unstable_useRoute } from "react-router";
import { useDisclosure } from "~/use-disclosure/useDisclosure";

/** Viser statusmelding fra Unleash */
export function InfoBanner() {
  const { loaderData } = unstable_useRoute("root");
  const { erÅpen, onLukk } = useDisclosure(true);
  const statusmelding = loaderData?.statusmelding;
  if (!statusmelding || !erÅpen) {
    return null;
  }
  return (
    <GlobalAlert status="announcement" className="mb-4">
      <GlobalAlertHeader className="px-4">
        <GlobalAlertTitle>{statusmelding.tittel}</GlobalAlertTitle>
        <GlobalAlertCloseButton onClick={onLukk} />
      </GlobalAlertHeader>
      {statusmelding.beskrivelse && (
        <GlobalAlertContent className="px-4">
          {statusmelding.beskrivelse}
        </GlobalAlertContent>
      )}
    </GlobalAlert>
  );
}
