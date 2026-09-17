import { PencilIcon } from "@navikt/aksel-icons";
import { Alert, Button, Modal, TextField, VStack } from "@navikt/ds-react";
import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { sporHendelse } from "~/analytics/analytics";
import { RouteConfig } from "~/routeConfig";
import { filnavnSchema, splittFilnavn } from "./filnavn-utils";

interface OmdøpFilModalProps {
  filId: string;
  filnavn: string;
  sakId: string;
  åpen: boolean;
  onClose: () => void;
}

export function OmdøpFilModal({ filId, filnavn, sakId, åpen, onClose }: OmdøpFilModalProps) {
  const fetcher = useFetcher<{ ok: boolean; melding?: string }>();
  const { navn: opprinneligNavn, endelse } = splittFilnavn(filnavn);
  const [navn, setNavn] = useState(opprinneligNavn);
  const [valideringsfeil, setValideringsfeil] = useState<string>();
  const [serverfeil, setServerfeil] = useState<string>();
  const submitPågår = useRef(false);
  const lagrer = fetcher.state !== "idle";
  const url = RouteConfig.API.SAK_FIL.replace(":sakId", sakId).replace(":filId", filId);

  useEffect(() => {
    if (!åpen) return;
    setNavn(opprinneligNavn);
    setValideringsfeil(undefined);
    setServerfeil(undefined);
  }, [åpen, opprinneligNavn]);

  useEffect(() => {
    if (!submitPågår.current || fetcher.state !== "idle") return;
    submitPågår.current = false;
    if (fetcher.data?.ok) {
      onClose();
    } else {
      setServerfeil(fetcher.data?.melding ?? "Kunne ikke endre filnavnet");
    }
  }, [fetcher.data, fetcher.state, onClose]);

  function lagre(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const resultat = filnavnSchema.safeParse(navn);
    if (!resultat.success) {
      setValideringsfeil(resultat.error.issues[0]?.message);
      return;
    }

    setValideringsfeil(undefined);
    setServerfeil(undefined);
    submitPågår.current = true;
    sporHendelse("vedlegg omdøpt", { sakId });
    fetcher.submit(
      { navn: resultat.data },
      { method: "patch", action: url, encType: "application/json" },
    );
  }

  return (
    <Modal
      open={åpen}
      onClose={onClose}
      onBeforeClose={() => !lagrer}
      header={{
        heading: "Endre navn på vedlegg",
        icon: <PencilIcon aria-hidden />,
        closeButton: !lagrer,
      }}
      width="small"
    >
      <form onSubmit={lagre}>
        <Modal.Body>
          <VStack gap="space-16">
            {serverfeil && (
              <Alert variant="error" size="small">
                {serverfeil}
              </Alert>
            )}
            <TextField
              label="Filnavn"
              description={
                endelse ? `Filendelsen ${endelse} beholdes.` : "Filen har ingen filendelse."
              }
              value={navn}
              onChange={(event) => setNavn(event.target.value)}
              error={valideringsfeil}
              maxLength={200}
              autoComplete="off"
            />
          </VStack>
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" loading={lagrer}>
            Lagre navn
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={lagrer}>
            Avbryt
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
