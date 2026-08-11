import { ArrowUndoIcon, ClockIcon } from "@navikt/aksel-icons";
import {
  Alert,
  BodyLong,
  BodyShort,
  Button,
  Detail,
  Loader,
  Modal,
  VStack,
} from "@navikt/ds-react";
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

type Historikkgruppe = {
  endretAv: string;
  punkter: DokumentHistorikkNode[];
};

function grupperHistorikk(historikk: DokumentHistorikkNode[]): Historikkgruppe[] {
  return historikk.reduce<Historikkgruppe[]>((grupper, punkt) => {
    const forrigeGruppe = grupper.at(-1);
    const sistePunkt = forrigeGruppe?.punkter.at(-1);
    const erSammeØkt =
      forrigeGruppe?.endretAv === punkt.endretAv &&
      sistePunkt !== undefined &&
      Math.abs(
        new Date(sistePunkt.endretTidspunkt).getTime() - new Date(punkt.endretTidspunkt).getTime(),
      ) <
        3 * 60 * 60 * 1000;
    if (erSammeØkt && forrigeGruppe) {
      forrigeGruppe.punkter.push(punkt);
    } else {
      grupper.push({ endretAv: punkt.endretAv, punkter: [punkt] });
    }
    return grupper;
  }, []);
}

export function DokumentHistorikkPanel({
  historikk,
  kanGjenopprette,
  hentHistorikkpunkt,
  gjenopprett,
  onGjenopprettet,
}: DokumentHistorikkPanelProps) {
  const [valgt, settValgt] = useState<DokumentHistorikk | null>(null);
  const [valgtId, settValgtId] = useState<string | null>(null);
  const [feil, settFeil] = useState<string | null>(null);
  const [laster, settLaster] = useState(false);
  const [gjenoppretter, settGjenoppretter] = useState(false);

  async function visForhåndsvisning(id: string) {
    settValgtId(id);
    settValgt(null);
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

  const valgtPunkt = historikk.find((punkt) => punkt.id === valgtId);
  const grupper = grupperHistorikk(historikk);

  return (
    <>
      <VStack gap="space-8">
        {historikk.length === 1 && (
          <BodyShort size="small">
            Dette er det første historikkpunktet. Vi oppdaterer det etter 30 sekunder uten endringer
            og oppretter minst ett punkt hvert kvarter mens du redigerer.
          </BodyShort>
        )}
        {grupper.map((gruppe) => (
          <VStack key={`${gruppe.endretAv}-${gruppe.punkter[0].id}`} gap="space-2">
            {gruppe.punkter.length > 1 && (
              <Detail className="text-ax-text-neutral-subtle">
                Redigeringsøkt · {gruppe.endretAv}
              </Detail>
            )}
            {gruppe.punkter.map((punkt) => (
              <Button
                key={punkt.id}
                type="button"
                variant="tertiary"
                size="small"
                className="justify-start text-left"
                loading={laster && valgtId === punkt.id}
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
          </VStack>
        ))}
      </VStack>

      <Modal
        open={valgtId !== null}
        onClose={() => {
          if (!gjenoppretter) {
            settValgt(null);
            settValgtId(null);
            settFeil(null);
          }
        }}
        header={{ heading: "Forhåndsvis historikkpunkt", icon: <ClockIcon aria-hidden /> }}
        width="medium"
      >
        <Modal.Body>
          {laster ? (
            <Loader title="Henter historikkpunkt" />
          ) : feil ? (
            <Alert variant="error" size="small">
              <BodyShort weight="semibold">Kunne ikke åpne denne versjonen</BodyShort>
              <BodyShort>
                Prøv igjen. Hvis feilen fortsetter, lukk dialogen og prøv på nytt senere.
              </BodyShort>
            </Alert>
          ) : (
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
          )}
        </Modal.Body>
        <Modal.Footer>
          {feil && valgtPunkt && (
            <Button variant="primary" onClick={() => void visForhåndsvisning(valgtPunkt.id)}>
              Prøv igjen
            </Button>
          )}
          {valgt && kanGjenopprette && (
            <Button
              variant="primary"
              icon={<ArrowUndoIcon aria-hidden />}
              loading={gjenoppretter}
              onClick={() => void bekreftGjenoppretting()}
            >
              Gjenopprett denne versjonen
            </Button>
          )}
          <Button
            variant="secondary"
            disabled={gjenoppretter}
            onClick={() => {
              settValgt(null);
              settValgtId(null);
              settFeil(null);
            }}
          >
            Lukk
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
