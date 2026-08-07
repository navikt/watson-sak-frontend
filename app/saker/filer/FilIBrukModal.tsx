import { FileTextIcon } from "@navikt/aksel-icons";
import { BodyLong, Button, Link, Modal, VStack } from "@navikt/ds-react";
import { RouteConfig } from "~/routeConfig";
import type { DokumentReferanse } from "./typer";

interface FilIBrukModalProps {
  /** Dokumentene filen er i bruk i, eller `null` når dialogen er lukket. */
  dokumenter: DokumentReferanse[] | null;
  filnavn: string;
  sakId: string;
  onClose: () => void;
}

/**
 * Forklarer hvorfor et vedlegg ikke kan slettes: det er satt inn som bilde i ett
 * eller flere dokumenter på saken. Sletting må skje ved å fjerne bildet fra
 * dokumentet(ene) først — dokumentnavnene lenker dit for enkel tilgang.
 */
export function FilIBrukModal({ dokumenter, filnavn, sakId, onClose }: FilIBrukModalProps) {
  return (
    <Modal
      open={dokumenter !== null}
      onClose={onClose}
      header={{ heading: "Filen er i bruk", icon: <FileTextIcon aria-hidden /> }}
      width="small"
    >
      <Modal.Body>
        <VStack gap="space-4">
          <BodyLong>
            <strong>{filnavn}</strong> kan ikke slettes fordi den er satt inn som bilde i{" "}
            {dokumenter && dokumenter.length > 1 ? "disse dokumentene" : "dette dokumentet"}:
          </BodyLong>
          <ul className="m-0 flex flex-col gap-2 pl-5">
            {dokumenter?.map((dokument) => (
              <li key={dokument.id}>
                <Link
                  href={RouteConfig.SAKER_DOKUMENT.replace(":sakId", sakId).replace(
                    ":docId",
                    dokument.id,
                  )}
                >
                  {dokument.tittel || "Uten tittel"}
                </Link>
              </li>
            ))}
          </ul>
          <BodyLong>Fjern bildet fra dokumentet for å kunne slette vedlegget.</BodyLong>
        </VStack>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Lukk
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
