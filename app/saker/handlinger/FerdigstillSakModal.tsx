import { CheckmarkCircleIcon } from "@navikt/aksel-icons";
import {
  BodyShort,
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  HStack,
  Modal,
  Radio,
  RadioGroup,
  Stepper,
  VStack,
} from "@navikt/ds-react";
import { useCallback, useMemo, useState } from "react";
import { useFetcher } from "react-router";
import type { FilNode } from "~/saker/filer/typer";
import type { SakHendelse } from "~/saker/historikk/typer";
import { RouteConfig } from "~/routeConfig";
import { getSaksreferanse } from "~/saker/id";

// ---------------------------------------------------------------------------
// Typer
// ---------------------------------------------------------------------------

type Avslutningstype =
  | "opprett_informasjonssak"
  | "kontrollrapport_straffesak"
  | "kontrollrapport_feilutbetaling"
  | "henlegg";

const AVSLUTNINGSTYPER: { verdi: Avslutningstype; label: string }[] = [
  { verdi: "opprett_informasjonssak", label: "Opprett informasjonssak" },
  { verdi: "kontrollrapport_straffesak", label: "Send kontrollrapport, mulig straffesak" },
  { verdi: "kontrollrapport_feilutbetaling", label: "Send kontrollrapport, feilutbetalingssak" },
  { verdi: "henlegg", label: "Henlegg" },
];

const SJEKKLISTE: { id: string; label: string }[] = [
  {
    id: "kontonumre",
    label: "Loggen inneholder oversikt over alle mottatte kontonumre",
  },
  {
    id: "melding-sendt",
    label: "Melding er sendt til forsikringsselskap, folkeregisteret eller andre ved behov",
  },
  {
    id: "bruker-varslet",
    label: "Bruker er varslet om innhenting av varslingspliktige opplysninger",
  },
  {
    id: "elektronisk-arkivert",
    label: "Alle opplysninger mottatt elektronisk er arkivert",
  },
  {
    id: "kontoutskrifter-slettet",
    label: "Kontoutskrifter er slettet",
  },
  {
    id: "logg-oppdatert",
    label: "Loggen er oppdatert med alle relevante hendelser",
  },
];

// ---------------------------------------------------------------------------
// Hjelper: flat liste over alle fil-IDer i et tre
// ---------------------------------------------------------------------------

function hentAlleFilIder(noder: FilNode[]): string[] {
  return noder.flatMap((node) => {
    if (node.type === "fil") return [node.id];
    return hentAlleFilIder(node.barn);
  });
}

// ---------------------------------------------------------------------------
// ValgbarFilTre – filtre med checkboxer
// ---------------------------------------------------------------------------

interface ValgbarFilTreProps {
  noder: FilNode[];
  valgteIder: Set<string>;
  onToggleFil: (id: string) => void;
  onToggleMappe: (noder: FilNode[]) => void;
  nivå?: number;
}

function ValgbarFilTre({
  noder,
  valgteIder,
  onToggleFil,
  onToggleMappe,
  nivå = 0,
}: ValgbarFilTreProps) {
  return (
    <ul className="flex flex-col gap-1" role="list">
      {noder.map((node) => {
        if (node.type === "mappe") {
          const alleIder = hentAlleFilIder(node.barn);
          const antallValgt = alleIder.filter((id) => valgteIder.has(id)).length;
          const alleValgt = alleIder.length > 0 && antallValgt === alleIder.length;
          const noenValgt = antallValgt > 0 && !alleValgt;

          return (
            <li key={node.id}>
              <Checkbox
                checked={alleValgt}
                indeterminate={noenValgt}
                onChange={() => onToggleMappe(node.barn)}
                style={{ paddingLeft: `${nivå * 1.5 + 0.5}rem` }}
              >
                {node.navn}
              </Checkbox>
              <ValgbarFilTre
                noder={node.barn}
                valgteIder={valgteIder}
                onToggleFil={onToggleFil}
                onToggleMappe={onToggleMappe}
                nivå={nivå + 1}
              />
            </li>
          );
        }

        return (
          <li key={node.id}>
            <Checkbox
              checked={valgteIder.has(node.id)}
              onChange={() => onToggleFil(node.id)}
              style={{ paddingLeft: `${nivå * 1.5 + 1.5}rem` }}
            >
              {node.navn}
            </Checkbox>
          </li>
        );
      })}
    </ul>
  );
}

// ---------------------------------------------------------------------------
// Steg 1 – Velg avslutningstype
// ---------------------------------------------------------------------------

interface VelgAvslutningtypeProps {
  verdi: Avslutningstype | null;
  onChange: (verdi: Avslutningstype) => void;
}

function VelgAvslutningstype({ verdi, onChange }: VelgAvslutningtypeProps) {
  return (
    <RadioGroup
      legend="Velg type avslutning"
      value={verdi ?? ""}
      onChange={(v) => onChange(v as Avslutningstype)}
    >
      {AVSLUTNINGSTYPER.map(({ verdi: v, label }) => (
        <Radio key={v} value={v}>
          {label}
        </Radio>
      ))}
    </RadioGroup>
  );
}

// ---------------------------------------------------------------------------
// Steg 2 – Velg filer
// ---------------------------------------------------------------------------

interface VelgFilerProps {
  filer: FilNode[];
  valgteFilIder: Set<string>;
  onToggleFil: (id: string) => void;
  onToggleMappe: (noder: FilNode[]) => void;
}

function VelgFiler({ filer, valgteFilIder, onToggleFil, onToggleMappe }: VelgFilerProps) {
  if (filer.length === 0) {
    return (
      <BodyShort className="text-ax-text-neutral-subtle">
        Ingen filer er lastet opp for denne saken.
      </BodyShort>
    );
  }

  return (
    <VStack gap="space-4">
      <BodyShort>Velg hvilke filer som skal journalføres ved ferdigstilling av saken.</BodyShort>
      <ValgbarFilTre
        noder={filer}
        valgteIder={valgteFilIder}
        onToggleFil={onToggleFil}
        onToggleMappe={onToggleMappe}
      />
    </VStack>
  );
}

// ---------------------------------------------------------------------------
// Steg 3 – Gjennomgå logg
// ---------------------------------------------------------------------------

function formaterTidspunkt(isoString: string): string {
  try {
    return new Intl.DateTimeFormat("nb-NO", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

function hendelseTittel(hendelse: SakHendelse): string {
  switch (hendelse.hendelsesType) {
    case "SAK_OPPRETTET":
      return "Sak opprettet";
    case "AVKLARING_OPPRETTET":
      return "Avklaring opprettet";
    case "SAK_TILDELT":
      return "Sak tildelt";
    case "STATUS_ENDRET":
      return "Status endret";
    case "SAKSINFORMASJON_ENDRET":
      return "Saksinformasjon endret";
    case "MOTTAKSENHET_ENDRET":
      return "Mottaksenhet endret";
    case "VIDERESENDT_TIL_NAY_NFP":
      return "Videresendt til NAY/NFP";
    case "POLITIANMELDT":
      return "Politianmeldt";
    case "SAK_HENLAGT":
      return "Sak henlagt";
    case "TILGANG_DELT":
      return "Tilgang delt";
    case "YTELSE_STANSET":
      return "Ytelse stanset";
    case "SAK_SATT_I_BERO":
      return "Sak satt i bero";
    case "SAK_GJENOPPTATT":
      return "Sak gjenopptatt";
    case "MANUELL_NOTAT":
      return hendelse.tittel ?? "Notat";
    default:
      return hendelse.hendelsesType;
  }
}

interface GjennomgåLoggProps {
  historikk: SakHendelse[];
  valgteHendelseIder: Set<string>;
  onToggleHendelse: (id: string) => void;
  onToggleAlle: () => void;
}

function GjennomgåLogg({
  historikk,
  valgteHendelseIder,
  onToggleHendelse,
  onToggleAlle,
}: GjennomgåLoggProps) {
  const alleValgt = historikk.length > 0 && valgteHendelseIder.size === historikk.length;
  const noenValgt = valgteHendelseIder.size > 0 && !alleValgt;

  return (
    <VStack gap="space-4">
      <BodyShort>
        Velg hvilke logginnslag som skal inkluderes. Alle er valgt som standard.
      </BodyShort>
      {historikk.length === 0 ? (
        <BodyShort className="text-ax-text-neutral-subtle">
          Ingen logginnslag for denne saken.
        </BodyShort>
      ) : (
        <VStack gap="space-1">
          <Checkbox
            checked={alleValgt}
            indeterminate={noenValgt}
            onChange={onToggleAlle}
            className="border-b border-ax-border-neutral pb-3"
          >
            <span className="font-semibold">Velg alle</span>
          </Checkbox>
          {historikk.map((hendelse) => (
            <Checkbox
              key={hendelse.hendelseId}
              checked={valgteHendelseIder.has(hendelse.hendelseId)}
              onChange={() => onToggleHendelse(hendelse.hendelseId)}
            >
              <VStack gap="space-0">
                <span className="text-sm font-medium">{hendelseTittel(hendelse)}</span>
                <span className="text-xs text-ax-text-neutral-subtle">
                  {formaterTidspunkt(hendelse.tidspunkt)}
                </span>
              </VStack>
            </Checkbox>
          ))}
        </VStack>
      )}
    </VStack>
  );
}

// ---------------------------------------------------------------------------
// Steg 4 – Sjekkliste
// ---------------------------------------------------------------------------

interface SjekklisteProps {
  huket: Set<string>;
  onToggle: (id: string) => void;
}

function Sjekkliste({ huket, onToggle }: SjekklisteProps) {
  return (
    <VStack gap="space-4">
      <BodyShort>
        Bekreft at alle punktene nedenfor er ivaretatt før du ferdigstiller saken.
      </BodyShort>
      <CheckboxGroup legend="Sjekkliste" hideLegend>
        {SJEKKLISTE.map(({ id, label }) => (
          <Checkbox key={id} checked={huket.has(id)} onChange={() => onToggle(id)}>
            {label}
          </Checkbox>
        ))}
      </CheckboxGroup>
    </VStack>
  );
}

// ---------------------------------------------------------------------------
// Hoved-modal
// ---------------------------------------------------------------------------

interface FerdigstillSakModalProps {
  sakId: string;
  filer: FilNode[];
  historikk: SakHendelse[];
  åpen: boolean;
  onClose: () => void;
}

const STEG_TITLER = ["Type", "Filer", "Logg", "Sjekkliste"];

export function FerdigstillSakModal({
  sakId,
  filer,
  historikk,
  åpen,
  onClose,
}: FerdigstillSakModalProps) {
  const fetcher = useFetcher();

  const [aktivtSteg, setAktivtSteg] = useState(1);
  const [avslutningstype, setAvslutningstype] = useState<Avslutningstype | null>(null);
  const [valgteFilIder, setValgteFilIder] = useState<Set<string>>(new Set());
  const [valgteHendelseIder, setValgteHendelseIder] = useState<Set<string>>(
    () => new Set(historikk.map((h) => h.hendelseId)),
  );
  const [sjekklisteHuket, setSjekklisteHuket] = useState<Set<string>>(new Set());

  function handleLukk() {
    onClose();
    // Nullstill tilstand ved lukking
    setAktivtSteg(1);
    setAvslutningstype(null);
    setValgteFilIder(new Set());
    setValgteHendelseIder(new Set(historikk.map((h) => h.hendelseId)));
    setSjekklisteHuket(new Set());
  }

  // Fil-toggling
  const toggleFil = useCallback((id: string) => {
    setValgteFilIder((prev) => {
      const neste = new Set(prev);
      if (neste.has(id)) {
        neste.delete(id);
      } else {
        neste.add(id);
      }
      return neste;
    });
  }, []);

  const toggleMappe = useCallback((barnNoder: FilNode[]) => {
    const alleIder = hentAlleFilIder(barnNoder);
    setValgteFilIder((prev) => {
      const neste = new Set(prev);
      const alleValgt = alleIder.every((id) => neste.has(id));
      if (alleValgt) {
        alleIder.forEach((id) => neste.delete(id));
      } else {
        alleIder.forEach((id) => neste.add(id));
      }
      return neste;
    });
  }, []);

  // Hendelse-toggling
  const toggleHendelse = useCallback((id: string) => {
    setValgteHendelseIder((prev) => {
      const neste = new Set(prev);
      if (neste.has(id)) {
        neste.delete(id);
      } else {
        neste.add(id);
      }
      return neste;
    });
  }, []);

  const toggleAlleHendelser = useCallback(() => {
    setValgteHendelseIder((prev) => {
      if (prev.size === historikk.length) {
        return new Set();
      }
      return new Set(historikk.map((h) => h.hendelseId));
    });
  }, [historikk]);

  // Sjekkliste-toggling
  const toggleSjekkliste = useCallback((id: string) => {
    setSjekklisteHuket((prev) => {
      const neste = new Set(prev);
      if (neste.has(id)) {
        neste.delete(id);
      } else {
        neste.add(id);
      }
      return neste;
    });
  }, []);

  // Validering per steg
  const kanGåVidere = useMemo(() => {
    if (aktivtSteg === 1) return avslutningstype !== null;
    return true;
  }, [aktivtSteg, avslutningstype]);

  const alleHuket = sjekklisteHuket.size === SJEKKLISTE.length;

  function handleFerdigstill() {
    fetcher.submit(
      {
        handling: "ferdigstill_sak",
        avslutningstype: avslutningstype ?? "",
        filIder: JSON.stringify([...valgteFilIder]),
        hendelseIder: JSON.stringify([...valgteHendelseIder]),
      },
      {
        method: "post",
        action: RouteConfig.SAKER_DETALJ.replace(":sakId", getSaksreferanse(sakId)),
      },
    );
    handleLukk();
  }

  return (
    <Modal
      open={åpen}
      onClose={handleLukk}
      header={{
        heading: "Ferdigstill sak",
        icon: <CheckmarkCircleIcon aria-hidden />,
      }}
      width="medium"
    >
      <Modal.Body>
        <VStack gap="space-0">
          <Box paddingBlock="space-12">
            <Stepper
              activeStep={aktivtSteg}
              onStepChange={setAktivtSteg}
              orientation="horizontal"
              aria-label="Steg i ferdigstillingsprosessen"
              className="w-full"
            >
              {STEG_TITLER.map((tittel, index) => (
                <Stepper.Step
                  key={tittel}
                  completed={index + 1 < aktivtSteg}
                  interactive={index + 1 < aktivtSteg}
                >
                  {tittel}
                </Stepper.Step>
              ))}
            </Stepper>
          </Box>

          <div className="pt-2">
            {aktivtSteg === 1 && (
              <VelgAvslutningstype verdi={avslutningstype} onChange={setAvslutningstype} />
            )}
            {aktivtSteg === 2 && (
              <VelgFiler
                filer={filer}
                valgteFilIder={valgteFilIder}
                onToggleFil={toggleFil}
                onToggleMappe={toggleMappe}
              />
            )}
            {aktivtSteg === 3 && (
              <GjennomgåLogg
                historikk={historikk}
                valgteHendelseIder={valgteHendelseIder}
                onToggleHendelse={toggleHendelse}
                onToggleAlle={toggleAlleHendelser}
              />
            )}
            {aktivtSteg === 4 && <Sjekkliste huket={sjekklisteHuket} onToggle={toggleSjekkliste} />}
          </div>
        </VStack>
      </Modal.Body>

      <Modal.Footer>
        <HStack gap="space-2" justify="space-between" className="w-full">
          <Button variant="secondary" onClick={handleLukk}>
            Avbryt
          </Button>
          <HStack gap="space-2">
            {aktivtSteg > 1 && (
              <Button variant="secondary" onClick={() => setAktivtSteg((s) => s - 1)}>
                Tilbake
              </Button>
            )}
            {aktivtSteg < 4 ? (
              <Button
                variant="primary"
                onClick={() => setAktivtSteg((s) => s + 1)}
                disabled={!kanGåVidere}
              >
                Neste
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleFerdigstill}
                disabled={!alleHuket}
                loading={fetcher.state !== "idle"}
              >
                Ferdigstill
              </Button>
            )}
          </HStack>
        </HStack>
      </Modal.Footer>
    </Modal>
  );
}
