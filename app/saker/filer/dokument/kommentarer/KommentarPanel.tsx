import { ChatIcon, PlusCircleIcon } from "@navikt/aksel-icons";
import { Alert, BodyShort, Button, Detail, HStack, Switch, VStack } from "@navikt/ds-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { elementEtikett, kategoriserElement, type AnkerTreff } from "./anker";
import { KommentarSkjema } from "./KommentarSkjema";
import { KommentarTraad } from "./KommentarTraad";
import { kommentarAnalytics, type Kommentarkilde } from "./kommentarer.analytics";
import { sorterTraader } from "./sortering";
import type { Anker, Ankertype, Kommentartraad } from "./typer";
import type { KommentarHandlinger, MutasjonResultat } from "./useKommentarer";

/** Et påbegynt anker: tråden finnes ikke før saksbehandleren har skrevet noe. */
export type KommentarUtkast = {
  ankertype: Ankertype;
  anker: Anker;
  opprinneligSitat?: string;
  /** Slate-typen på elementet, når ankeret er et element. Brukes til etikett og analytics. */
  elementtype?: string;
  kilde: Kommentarkilde;
};

export type KommentarPanelProps = {
  traader: Kommentartraad[];
  treffPerTraad: Map<string, AnkerTreff | null>;
  aktivTraadId: string | null;
  /** Kommentering er skilt fra redigering: lesetilgang holder, arkivert dokument ikke. */
  kanKommentere: boolean;
  arkivert: boolean;
  sender: boolean;
  utkast: KommentarUtkast | null;
  handlinger: KommentarHandlinger;
  onStartGenereltUtkast: () => void;
  onAvbrytUtkast: () => void;
  onVelgTraad: (traadId: string | null) => void;
  onGåTilAnker: (traad: Kommentartraad) => void;
};

function utkastEtikett(utkast: KommentarUtkast): string {
  if (utkast.ankertype === "DOCUMENT") return "Ny generell kommentar";
  if (utkast.ankertype === "ELEMENT") {
    return `Ny kommentar på ${elementEtikett(utkast.elementtype).toLocaleLowerCase("nb-NO")}`;
  }
  return "Ny kommentar på markert tekst";
}

export function KommentarPanel({
  traader,
  treffPerTraad,
  aktivTraadId,
  kanKommentere,
  arkivert,
  sender,
  utkast,
  handlinger,
  onStartGenereltUtkast,
  onAvbrytUtkast,
  onVelgTraad,
  onGåTilAnker,
}: KommentarPanelProps) {
  const [visLoste, settVisLoste] = useState(false);
  const [statusmelding, settStatusmelding] = useState("");
  const [utkastfeil, settUtkastfeil] = useState<string | null>(null);
  const traadRefs = useRef(new Map<string, HTMLDivElement>());

  const sortert = useMemo(() => sorterTraader(traader, treffPerTraad), [traader, treffPerTraad]);
  const uloste = sortert.filter((traad) => !traad.adressert);
  const loste = sortert.filter((traad) => traad.adressert);
  const synlige = visLoste ? [...uloste, ...loste] : uloste;

  /**
   * Når en tråd velges utenfra (klikk i dokumentet eller dyplenke), skal den rulles
   * frem og få fokus slik at også tastaturbrukere finner den igjen.
   *
   * Effekten avhenger **kun** av `aktivTraadId`. Tidligere lå også antall synlige
   * tråder i avhengighetene, noe som stjal fokus hver gang man slo på «Vis løste»
   * eller la til/slettet en kommentar – midt i det man holdt på med.
   */
  useEffect(() => {
    if (!aktivTraadId) return;
    // Tråden kan være filtrert bort (f.eks. løst og skjult). Da finnes ingen ref,
    // og vi lar fokus stå der brukeren har det.
    const element = traadRefs.current.get(aktivTraadId);
    if (!element) return;
    // jsdom (og eldre nettlesere) mangler scrollIntoView – fokus er det viktigste.
    element.scrollIntoView?.({ block: "nearest" });
    element.focus({ preventScroll: true });
  }, [aktivTraadId]);

  function håndterUtkastResultat(resultat: MutasjonResultat): boolean {
    if (!utkast) return false;
    const analyticsdata = {
      ankertype: utkast.ankertype,
      kilde: utkast.kilde,
      elementtype:
        utkast.ankertype === "ELEMENT" ? kategoriserElement(utkast.elementtype) : undefined,
    };

    if (resultat.ok) {
      kommentarAnalytics.opprettet(analyticsdata);
      settUtkastfeil(null);
      settStatusmelding("Kommentaren er lagt til.");
      onAvbrytUtkast();
      if (resultat.traad) onVelgTraad(resultat.traad.id);
      return true;
    }

    kommentarAnalytics.opprettingFeilet({
      ...analyticsdata,
      resultat: resultat.konflikt ? "konflikt" : "feil",
    });
    settUtkastfeil(resultat.melding);
    return false;
  }

  return (
    <VStack gap="space-12" className="min-h-0">
      {arkivert && (
        <Alert variant="info" size="small" inline>
          Dokumentet er arkivert. Kommentarer kan leses, men ikke endres.
        </Alert>
      )}

      <HStack justify="space-between" align="center" gap="space-8" wrap>
        <Button
          type="button"
          size="small"
          variant="secondary"
          icon={<PlusCircleIcon aria-hidden />}
          disabled={!kanKommentere}
          onClick={onStartGenereltUtkast}
        >
          Ny kommentar
        </Button>
        {loste.length > 0 && (
          <Switch
            size="small"
            checked={visLoste}
            onChange={(event) => {
              settVisLoste(event.target.checked);
              kommentarAnalytics.filterBrukt("vis_loste", event.target.checked ? "på" : "av");
            }}
          >
            Vis løste ({loste.length})
          </Switch>
        )}
      </HStack>

      {/* Én felles live-region for panelet. Skjermlesere får beskjed når en
          kommentar legges til, endres, løses eller slettes. */}
      <div aria-live="polite" className="sr-only">
        {statusmelding}
      </div>

      {utkast && (
        <VStack
          gap="space-8"
          className="rounded-lg border border-ax-border-accent bg-ax-bg-accent-soft p-[var(--ax-space-12)]"
        >
          <Detail weight="semibold">{utkastEtikett(utkast)}</Detail>
          {utkast.opprinneligSitat && (
            <BodyShort
              size="small"
              as="blockquote"
              className="border-l-2 border-ax-border-neutral-subtle pl-2 italic"
            >
              {utkast.opprinneligSitat}
            </BodyShort>
          )}
          {utkastfeil && (
            <Alert variant="warning" size="small" inline>
              {utkastfeil}
            </Alert>
          )}
          <KommentarSkjema
            etikett="Kommentar"
            knappetekst="Legg til kommentar"
            autoFokus
            sender={sender}
            onLagre={async (tekst) =>
              håndterUtkastResultat(
                await handlinger.opprettTraad({
                  anker: utkast.anker,
                  opprinneligSitat: utkast.opprinneligSitat ?? null,
                  tekst,
                }),
              )
            }
            onAvbryt={() => {
              kommentarAnalytics.opprettingAvbrutt({
                ankertype: utkast.ankertype,
                kilde: utkast.kilde,
                elementtype:
                  utkast.ankertype === "ELEMENT"
                    ? kategoriserElement(utkast.elementtype)
                    : undefined,
              });
              settUtkastfeil(null);
              onAvbrytUtkast();
            }}
          />
        </VStack>
      )}

      {synlige.length === 0 && !utkast ? (
        <HStack gap="space-8" align="center">
          <ChatIcon aria-hidden fontSize="1.25rem" />
          <BodyShort size="small" className="text-ax-text-neutral-subtle">
            {loste.length > 0
              ? "Ingen uløste kommentarer."
              : "Ingen kommentarer på dette dokumentet ennå."}
          </BodyShort>
        </HStack>
      ) : (
        <VStack gap="space-8">
          {synlige.map((traad) => (
            <div
              key={traad.id}
              tabIndex={-1}
              ref={(element) => {
                if (element) traadRefs.current.set(traad.id, element);
                else traadRefs.current.delete(traad.id);
              }}
            >
              <KommentarTraad
                traad={traad}
                treff={treffPerTraad.get(traad.id)}
                erAktiv={traad.id === aktivTraadId}
                kanKommentere={kanKommentere}
                sender={sender}
                handlinger={handlinger}
                onVelg={() => {
                  onVelgTraad(traad.id);
                  // Klikk på tråden ruller også til ankeret. Stille – analytics
                  // sporer bare den eksplisitte «Gå til stedet»-knappen.
                  onGåTilAnker(traad);
                }}
                onGåTilAnker={() => {
                  kommentarAnalytics.ankernavigasjon(traad.ankertype, "til_anker");
                  onGåTilAnker(traad);
                }}
                onMelding={settStatusmelding}
              />
            </div>
          ))}
        </VStack>
      )}
    </VStack>
  );
}
