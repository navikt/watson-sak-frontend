import { FolderFileIcon, FolderPlusIcon, PencilIcon } from "@navikt/aksel-icons";
import { Alert, Button, Modal, Select, TextField, VStack } from "@navikt/ds-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { sporHendelse } from "~/analytics/analytics";
import { erLikEllerUnder, forelder, mappenavn, mappenavnSchema, slåSammen } from "./mappesti";
import { useMappehandling } from "./useMappehandling";

const ROTNIVÅ = "";

/** Et element som kan flyttes til en annen mappe. `mappe` er nåværende plassering. */
export type FlyttbartElement =
  | { type: "mappe"; sti: string }
  | { type: "dokument" | "fil"; id: string; navn: string; mappe: string | null };

function visningsnavnForElement(element: FlyttbartElement) {
  return element.type === "mappe" ? mappenavn(element.sti) : element.navn;
}

interface MappeskjemaModalProps {
  heading: string;
  ikon: ReactNode;
  lagreTekst: string;
  lagrer: boolean;
  serverfeil?: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  children: ReactNode;
}

function MappeskjemaModal({
  heading,
  ikon,
  lagreTekst,
  lagrer,
  serverfeil,
  onSubmit,
  onClose,
  children,
}: MappeskjemaModalProps) {
  return (
    <Modal
      open
      onClose={onClose}
      onBeforeClose={() => !lagrer}
      header={{ heading, icon: ikon, closeButton: !lagrer }}
      width="small"
    >
      <form onSubmit={onSubmit}>
        <Modal.Body>
          <VStack gap="space-16">
            {serverfeil && (
              <Alert variant="error" size="small">
                {serverfeil}
              </Alert>
            )}
            {children}
          </VStack>
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit" loading={lagrer}>
            {lagreTekst}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} disabled={lagrer}>
            Avbryt
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}

function MappevelgerSelect({
  label,
  mapper,
  verdi,
  onEndre,
  error,
}: {
  label: string;
  mapper: string[];
  verdi: string;
  onEndre: (verdi: string) => void;
  error?: string;
}) {
  return (
    <Select label={label} value={verdi} onChange={(e) => onEndre(e.target.value)} error={error}>
      <option value={ROTNIVÅ}>Rotnivå</option>
      {mapper.map((sti) => (
        <option key={sti} value={sti}>
          {sti.replaceAll("/", " / ")}
        </option>
      ))}
    </Select>
  );
}

/** Validerer et mappenavn og sjekker at det ikke kolliderer med en eksisterende mappe. */
function validerNavn(
  navn: string,
  forelderSti: string | null,
  mapper: string[],
): { sti: string } | { feil: string } {
  const resultat = mappenavnSchema.safeParse(navn);
  if (!resultat.success) {
    return { feil: resultat.error.issues[0]?.message ?? "Ugyldig mappenavn" };
  }
  const sti = slåSammen(forelderSti, resultat.data);
  if (mapper.includes(sti)) {
    return { feil: "Det finnes allerede en mappe med dette navnet her" };
  }
  return { sti };
}

interface OpprettMappeModalProps {
  sakId: string;
  /** Alle eksisterende mappestier på saken. */
  mapper: string[];
  onClose: () => void;
}

export function OpprettMappeModal({ sakId, mapper, onClose }: OpprettMappeModalProps) {
  const { utfør, pågår, feil } = useMappehandling(sakId, onClose);
  const [navn, settNavn] = useState("");
  const [plassering, settPlassering] = useState(ROTNIVÅ);
  const [valideringsfeil, settValideringsfeil] = useState<string>();

  function lagre(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const resultat = validerNavn(navn, plassering || null, mapper);
    if ("feil" in resultat) {
      settValideringsfeil(resultat.feil);
      return;
    }
    settValideringsfeil(undefined);
    sporHendelse("mappe opprettet", { sakId, nivå: resultat.sti.split("/").length });
    utfør({ handling: "opprett", sti: resultat.sti });
  }

  return (
    <MappeskjemaModal
      heading="Opprett mappe"
      ikon={<FolderPlusIcon aria-hidden />}
      lagreTekst="Opprett mappe"
      lagrer={pågår}
      serverfeil={feil}
      onSubmit={lagre}
      onClose={onClose}
    >
      <TextField
        label="Mappenavn"
        value={navn}
        onChange={(event) => settNavn(event.target.value)}
        error={valideringsfeil}
        maxLength={100}
        autoComplete="off"
      />
      <MappevelgerSelect
        label="Plassering"
        mapper={mapper}
        verdi={plassering}
        onEndre={settPlassering}
      />
    </MappeskjemaModal>
  );
}

interface GiNyttNavnMappeModalProps {
  sakId: string;
  sti: string;
  mapper: string[];
  onClose: () => void;
}

export function GiNyttNavnMappeModal({ sakId, sti, mapper, onClose }: GiNyttNavnMappeModalProps) {
  const { utfør, pågår, feil } = useMappehandling(sakId, onClose);
  const [navn, settNavn] = useState(mappenavn(sti));
  const [valideringsfeil, settValideringsfeil] = useState<string>();

  function lagre(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (navn.trim() === mappenavn(sti)) {
      onClose();
      return;
    }
    const resultat = validerNavn(navn, forelder(sti), mapper);
    if ("feil" in resultat) {
      settValideringsfeil(resultat.feil);
      return;
    }
    settValideringsfeil(undefined);
    sporHendelse("mappe omdøpt", { sakId });
    utfør({ handling: "endre", fraSti: sti, tilSti: resultat.sti });
  }

  return (
    <MappeskjemaModal
      heading="Gi mappen nytt navn"
      ikon={<PencilIcon aria-hidden />}
      lagreTekst="Lagre navn"
      lagrer={pågår}
      serverfeil={feil}
      onSubmit={lagre}
      onClose={onClose}
    >
      <TextField
        label="Mappenavn"
        value={navn}
        onChange={(event) => settNavn(event.target.value)}
        error={valideringsfeil}
        maxLength={100}
        autoComplete="off"
      />
    </MappeskjemaModal>
  );
}

interface FlyttTilMappeModalProps {
  sakId: string;
  element: FlyttbartElement;
  mapper: string[];
  onClose: () => void;
}

/** Tastaturvennlig alternativ til dra og slipp: velg hvilken mappe elementet skal flyttes til. */
export function FlyttTilMappeModal({ sakId, element, mapper, onClose }: FlyttTilMappeModalProps) {
  const { utfør, pågår, feil } = useMappehandling(sakId, onClose);
  const nåværende = element.type === "mappe" ? forelder(element.sti) : element.mappe;
  const [mål, settMål] = useState(nåværende ?? ROTNIVÅ);
  const [valideringsfeil, settValideringsfeil] = useState<string>();

  // En mappe kan ikke flyttes inn i seg selv eller i en av sine egne undermapper.
  const gyldigeMapper =
    element.type === "mappe" ? mapper.filter((sti) => !erLikEllerUnder(sti, element.sti)) : mapper;

  function lagre(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const målmappe = mål || null;
    if (målmappe === nåværende) {
      onClose();
      return;
    }
    if (element.type === "mappe") {
      const tilSti = slåSammen(målmappe, mappenavn(element.sti));
      if (mapper.includes(tilSti)) {
        settValideringsfeil("Det finnes allerede en mappe med samme navn der");
        return;
      }
      settValideringsfeil(undefined);
      sporHendelse("mappe flyttet", { sakId, metode: "meny" });
      utfør({ handling: "endre", fraSti: element.sti, tilSti });
      return;
    }
    sporHendelse(element.type === "dokument" ? "dokument flyttet" : "vedlegg flyttet", {
      sakId,
      metode: "meny",
    });
    utfør({
      handling: element.type === "dokument" ? "flytt-dokument" : "flytt-fil",
      id: element.id,
      mappe: målmappe,
    });
  }

  return (
    <MappeskjemaModal
      heading={`Flytt «${visningsnavnForElement(element)}»`}
      ikon={<FolderFileIcon aria-hidden />}
      lagreTekst="Flytt"
      lagrer={pågår}
      serverfeil={feil}
      onSubmit={lagre}
      onClose={onClose}
    >
      <MappevelgerSelect
        label="Flytt til"
        mapper={gyldigeMapper}
        verdi={mål}
        onEndre={settMål}
        error={valideringsfeil}
      />
    </MappeskjemaModal>
  );
}
