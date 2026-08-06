import { FileTextIcon } from "@navikt/aksel-icons";
import { BodyLong, Button, Modal, VStack } from "@navikt/ds-react";
import type { DokumentReferanse } from "./typer";

interface FilIBrukModalProps {
  /** Dokumentene filen er i bruk i, eller `null` når dialogen er lukket. */
  dokumenter: DokumentReferanse[] | null;
  filnavn: string;
  onClose: () => void;
}

/**
 * Forklarer hvorfor et vedlegg ikke kan slettes: det er satt inn som bilde i ett
 * eller flere dokumenter på saken. Sletting må skje ved å fjerne bildet fra
 * dokumentet(ene) først.
 */
export function FilIBrukModal({ dokumenter, filnavn, onClose }: FilIBrukModalProps) {
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
          <ul>
            {dokumenter?.map((dokument) => (
              <li key={dokument.id}>{dokument.tittel || "Uten tittel"}</li>
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
