import {
  ArrowUndoIcon,
  ChatElipsisIcon,
  CheckmarkCircleIcon,
  LinkBrokenIcon,
  PencilIcon,
  TrashIcon,
} from "@navikt/aksel-icons";
import { Alert, BodyLong, BodyShort, Button, Detail, HStack, Tag, VStack } from "@navikt/ds-react";
import { useState } from "react";
import { NORSK_TIDSSONE } from "~/utils/date-utils";
import { elementEtikett, type AnkerTreff } from "./anker";
import { KommentarSkjema } from "./KommentarSkjema";
import { kommentarAnalytics } from "./kommentarer.analytics";
import type { KommentarHandlinger, MutasjonResultat } from "./useKommentarer";
import type { Kommentar, Kommentartraad } from "./typer";

/** Norsk dato og klokkeslett i norsk tidssone, uavhengig av nettleserens tidssone. */
function formaterKommentartidspunkt(isoTidspunkt: string): string {
  try {
    return new Intl.DateTimeFormat("nb-NO", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: NORSK_TIDSSONE,
    }).format(new Date(isoTidspunkt));
  } catch {
    return isoTidspunkt;
  }
}

function Ankerbeskrivelse({
  traad,
  treff,
}: {
  traad: Kommentartraad;
  treff: AnkerTreff | null | undefined;
}) {
  if (traad.ankertype === "DOCUMENT") {
    return <Detail className="text-ax-text-neutral-subtle">Generell kommentar</Detail>;
  }

  const elementtype =
    traad.anker.type === "ELEMENT" ? elementEtikett(traad.anker.elementtype) : null;
  const sitat = traad.opprinneligSitat?.trim();

  return (
    <VStack gap="space-2">
      {elementtype && <Detail className="text-ax-text-neutral-subtle">{elementtype}</Detail>}
      {sitat && (
        <BodyShort
          size="small"
          as="blockquote"
          className="border-l-2 border-ax-border-neutral-subtle pl-2 italic text-ax-text-neutral-subtle"
        >
          {sitat}
        </BodyShort>
      )}
      {!treff && (
        <HStack gap="space-4" align="center">
          <LinkBrokenIcon aria-hidden fontSize="1rem" />
          <Detail>Frakoblet – teksten finnes ikke lenger i dokumentet</Detail>
        </HStack>
      )}
    </VStack>
  );
}

function KommentarRad({
  kommentar,
  kanEndre,
  sender,
  onRediger,
  onSlett,
}: {
  kommentar: Kommentar;
  kanEndre: boolean;
  sender: boolean;
  onRediger: (tekst: string) => Promise<boolean>;
  onSlett: () => Promise<void>;
}) {
  const [redigerer, settRedigerer] = useState(false);
  const [bekrefterSletting, settBekrefterSletting] = useState(false);

  return (
    <VStack gap="space-4" as="li" className="list-none">
      <HStack gap="space-8" align="baseline" wrap>
        <BodyShort size="small" weight="semibold">
          {kommentar.forfatterNavn || "Ukjent"}
        </BodyShort>
        <Detail className="text-ax-text-neutral-subtle">
          {formaterKommentartidspunkt(kommentar.opprettet)}
          {kommentar.endret !== kommentar.opprettet ? " · endret" : ""}
        </Detail>
      </HStack>

      {redigerer ? (
        <KommentarSkjema
          etikett="Rediger kommentaren"
          knappetekst="Lagre"
          startverdi={kommentar.tekst}
          autoFokus
          sender={sender}
          onLagre={async (tekst) => {
            const ok = await onRediger(tekst);
            if (ok) settRedigerer(false);
            return ok;
          }}
          onAvbryt={() => settRedigerer(false)}
        />
      ) : (
        <BodyLong size="small" className="whitespace-pre-wrap break-words">
          {kommentar.tekst}
        </BodyLong>
      )}

      {kommentar.erEgen && kanEndre && !redigerer && (
        <HStack gap="space-4">
          <Button
            type="button"
            size="xsmall"
            variant="tertiary"
            icon={<PencilIcon aria-hidden />}
            onClick={() => settRedigerer(true)}
          >
            Rediger
          </Button>
          {bekrefterSletting ? (
            <>
              <Button
                type="button"
                size="xsmall"
                variant="primary"
                data-color="danger"
                loading={sender}
                onClick={async () => {
                  await onSlett();
                  settBekrefterSletting(false);
                }}
              >
                Bekreft sletting
              </Button>
              <Button
                type="button"
                size="xsmall"
                variant="tertiary"
                onClick={() => settBekrefterSletting(false)}
              >
                Avbryt
              </Button>
            </>
          ) : (
            <Button
              type="button"
              size="xsmall"
              variant="tertiary-neutral"
              icon={<TrashIcon aria-hidden />}
              onClick={() => settBekrefterSletting(true)}
            >
              Slett
            </Button>
          )}
        </HStack>
      )}
    </VStack>
  );
}

export type KommentarTraadProps = {
  traad: Kommentartraad;
  treff: AnkerTreff | null | undefined;
  erAktiv: boolean;
  /** Kommentering er lov selv om dokumentet ikke kan redigeres – men ikke når det er arkivert. */
  kanKommentere: boolean;
  sender: boolean;
  handlinger: KommentarHandlinger;
  onVelg: () => void;
  onGåTilAnker: () => void;
  onMelding: (melding: string) => void;
};

export function KommentarTraad({
  traad,
  treff,
  erAktiv,
  kanKommentere,
  sender,
  handlinger,
  onVelg,
  onGåTilAnker,
  onMelding,
}: KommentarTraadProps) {
  const [svarer, settSvarer] = useState(false);
  const [feil, settFeil] = useState<string | null>(null);

  function håndterResultat(resultat: MutasjonResultat, suksessmelding: string): boolean {
    if (resultat.ok) {
      settFeil(null);
      onMelding(suksessmelding);
      return true;
    }
    settFeil(resultat.melding);
    return false;
  }

  /** Oversetter et mislykket resultat til det lukkede analytics-resultatet. */
  function resultatkode(resultat: MutasjonResultat): "konflikt" | "feil" {
    return !resultat.ok && resultat.konflikt ? "konflikt" : "feil";
  }

  const kanEndreTråden = kanKommentere && !traad.adressert;

  /**
   * Klikk på tråden velger den og ruller til ankeret. Klikk på en kontroll inne i
   * tråden (rediger, slett, svar, løs – eller et felt i skjemaet) skal derimot bare
   * gjøre sin egen ting: ellers hopper editoren av gårde mens man skriver.
   *
   * Én sjekk her er mer robust enn `stopPropagation` spredt på hver enkelt knapp,
   * og dekker også kontroller som legges til senere.
   */
  function håndterKlikk(event: React.MouseEvent<HTMLElement>) {
    if (
      event.target instanceof Element &&
      event.target.closest("button, a, input, textarea, select, form, [role='button']")
    ) {
      return;
    }
    onVelg();
  }

  return (
    <VStack
      as="article"
      gap="space-8"
      aria-labelledby={`kommentartraad-${traad.id}`}
      data-kommentartraad={traad.id}
      data-aktiv={erAktiv ? "true" : "false"}
      onClick={håndterKlikk}
      className={
        "rounded-lg border p-[var(--ax-space-12)] " +
        (erAktiv
          ? "border-ax-border-accent border-l-4 bg-ax-bg-accent-soft"
          : "border-ax-border-neutral-subtle bg-ax-bg-default")
      }
    >
      <HStack justify="space-between" align="start" gap="space-8" wrap>
        <VStack gap="space-2" className="min-w-0">
          <BodyShort size="small" weight="semibold" id={`kommentartraad-${traad.id}`}>
            {traad.opprettetAvNavn || "Ukjent"}
          </BodyShort>
          <Detail className="text-ax-text-neutral-subtle">
            {formaterKommentartidspunkt(traad.opprettet)}
          </Detail>
        </VStack>
        {traad.adressert && (
          <Tag variant="success" size="xsmall" icon={<CheckmarkCircleIcon aria-hidden />}>
            Løst
          </Tag>
        )}
      </HStack>

      <Ankerbeskrivelse traad={traad} treff={treff} />

      {treff && treff.type !== "DOCUMENT" && !traad.adressert && (
        <Button
          type="button"
          size="xsmall"
          variant="tertiary"
          className="self-start"
          onClick={onGåTilAnker}
        >
          Gå til stedet i dokumentet
        </Button>
      )}

      <VStack as="ul" gap="space-12" className="m-0 list-none p-0">
        {traad.kommentarer.map((kommentar) => (
          <KommentarRad
            key={kommentar.id}
            kommentar={kommentar}
            kanEndre={kanEndreTråden}
            sender={sender}
            onRediger={async (tekst) => {
              const resultat = await handlinger.rediger(kommentar, tekst);
              if (resultat.ok) kommentarAnalytics.redigert(traad.ankertype);
              else kommentarAnalytics.redigeringFeilet(traad.ankertype, resultatkode(resultat));
              return håndterResultat(resultat, "Kommentaren er endret.");
            }}
            onSlett={async () => {
              const resultat = await handlinger.slett(kommentar);
              if (resultat.ok) kommentarAnalytics.slettet(traad.ankertype);
              else kommentarAnalytics.slettingFeilet(traad.ankertype, resultatkode(resultat));
              håndterResultat(resultat, "Kommentaren er slettet.");
            }}
          />
        ))}
      </VStack>

      {feil && (
        <Alert variant="warning" size="small" inline>
          {feil}
        </Alert>
      )}

      {kanEndreTråden && (
        <VStack gap="space-8">
          {svarer ? (
            <KommentarSkjema
              etikett="Svar på kommentaren"
              knappetekst="Svar"
              autoFokus
              sender={sender}
              onLagre={async (tekst) => {
                const resultat = await handlinger.svar(traad, tekst);
                if (resultat.ok) kommentarAnalytics.svarOpprettet(traad.ankertype);
                else kommentarAnalytics.svarFeilet(traad.ankertype, resultatkode(resultat));
                const ok = håndterResultat(resultat, "Svaret er lagt til.");
                if (ok) settSvarer(false);
                return ok;
              }}
              onAvbryt={() => settSvarer(false)}
            />
          ) : (
            <HStack gap="space-4">
              <Button
                type="button"
                size="xsmall"
                variant="tertiary"
                icon={<ChatElipsisIcon aria-hidden />}
                onClick={() => settSvarer(true)}
              >
                Svar
              </Button>
              <Button
                type="button"
                size="xsmall"
                variant="tertiary"
                icon={<CheckmarkCircleIcon aria-hidden />}
                loading={sender}
                onClick={async () => {
                  const resultat = await handlinger.settAdressering(traad, true);
                  if (resultat.ok) kommentarAnalytics.adressert(traad.ankertype);
                  else
                    kommentarAnalytics.adresseringFeilet(
                      traad.ankertype,
                      "løs",
                      resultatkode(resultat),
                    );
                  håndterResultat(resultat, "Kommentaren er markert som løst.");
                }}
              >
                Marker som løst
              </Button>
            </HStack>
          )}
        </VStack>
      )}

      {kanKommentere && traad.adressert && (
        <Button
          type="button"
          size="xsmall"
          variant="tertiary"
          className="self-start"
          icon={<ArrowUndoIcon aria-hidden />}
          loading={sender}
          onClick={async () => {
            const resultat = await handlinger.settAdressering(traad, false);
            if (resultat.ok) kommentarAnalytics.gjenåpnet(traad.ankertype);
            else
              kommentarAnalytics.adresseringFeilet(
                traad.ankertype,
                "gjenåpne",
                resultatkode(resultat),
              );
            håndterResultat(resultat, "Kommentaren er gjenåpnet.");
          }}
        >
          Gjenåpne
        </Button>
      )}
    </VStack>
  );
}
