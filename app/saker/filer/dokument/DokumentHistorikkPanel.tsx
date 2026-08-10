import { ArrowUndoIcon, ClockIcon } from "@navikt/aksel-icons";
import { BodyLong, BodyShort, Button, Detail, HStack, Modal, VStack } from "@navikt/ds-react";
import { useState } from "react";
import type { Dokument, DokumentHistorikk, DokumentHistorikkNode } from "~/saker/filer/typer";

type DokumentHistorikkPanelProps = {
  historikk: DokumentHistorikkNode[];
  kanGjenopprette: boolean;
  hentHistorikkpunkt: (id: string) => Promise<DokumentHistorikk>;
  gjenopprett: (id: string) => Promise<Dokument>;
  onGjenopprettet: (dokument: Dokument) => void;
};

function formaterTidspunkt(tidspunkt: string): string {
  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(tidspunkt));
}

function hentTekst(verdi: unknown): string {
  if (Array.isArray(verdi)) return verdi.map(hentTekst).filter(Boolean).join("\n");
  if (!verdi || typeof verdi !== "object") return "";
  if ("text" in verdi && typeof verdi.text === "string") return verdi.text;
  if ("children" in verdi) return hentTekst(verdi.children);
  return "";
}

export function DokumentHistorikkPanel({
  historikk,
  kanGjenopprette,
  hentHistorikkpunkt,
  gjenopprett,
  onGjenopprettet,
}: DokumentHistorikkPanelProps) {
  const [valgt, settValgt] = useState<DokumentHistorikk | null>(null);
  const [feil, settFeil] = useState<string | null>(null);
  const [laster, settLaster] = useState(false);
  const [gjenoppretter, settGjenoppretter] = useState(false);

  async function visForhåndsvisning(id: string) {
    settLaster(true);
    settFeil(null);
    try {
      settValgt(await hentHistorikkpunkt(id));
    } catch {
      settFeil("Kunne ikke hente historikkpunktet.");
    } finally {
      settLaster(false);
    }
  }

  async function bekreftGjenoppretting() {
    if (!valgt) return;
    settGjenoppretter(true);
    settFeil(null);
    try {
      const dokument = await gjenopprett(valgt.id);
      onGjenopprettet(dokument);
      settValgt(null);
    } catch {
      settFeil("Kunne ikke gjenopprette historikkpunktet.");
    } finally {
      settGjenoppretter(false);
    }
  }

  if (historikk.length === 0) {
    return <BodyShort size="small">Ingen historikk ennå.</BodyShort>;
  }

  return (
    <>
      <VStack gap="space-8">
        {historikk.map((punkt) => (
          <Button
            key={punkt.id}
            type="button"
            variant="tertiary"
            size="small"
            className="justify-start text-left"
            loading={laster}
            onClick={() => void visForhåndsvisning(punkt.id)}
          >
            <VStack as="span" gap="space-0">
              <span>{punkt.tittel}</span>
              <Detail as="span" className="text-ax-text-neutral-subtle">
                {punkt.endretAv} · {formaterTidspunkt(punkt.endretTidspunkt)}
              </Detail>
            </VStack>
          </Button>
        ))}
        {feil && <BodyShort className="text-ax-text-danger">{feil}</BodyShort>}
      </VStack>

      <Modal
        open={valgt !== null}
        onClose={() => {
          if (!gjenoppretter) settValgt(null);
        }}
        header={{ heading: "Forhåndsvis historikkpunkt", icon: <ClockIcon aria-hidden /> }}
        width="medium"
      >
        <Modal.Body>
          <VStack gap="space-16">
            <VStack gap="space-2">
              <BodyShort weight="semibold">{valgt?.tittel}</BodyShort>
              <Detail className="text-ax-text-neutral-subtle">
                {valgt && `${valgt.endretAv} · ${formaterTidspunkt(valgt.endretTidspunkt)}`}
              </Detail>
            </VStack>
            <BodyLong className="whitespace-pre-wrap">
              {valgt ? hentTekst(valgt.innhold) : ""}
            </BodyLong>
          </VStack>
        </Modal.Body>
        <Modal.Footer>
          {kanGjenopprette && (
            <Button
              variant="primary"
              icon={<ArrowUndoIcon aria-hidden />}
              loading={gjenoppretter}
              onClick={() => void bekreftGjenoppretting()}
            >
              Gjenopprett denne versjonen
            </Button>
          )}
          <Button variant="secondary" disabled={gjenoppretter} onClick={() => settValgt(null)}>
            Lukk
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
