import { Button, HStack, Textarea, VStack } from "@navikt/ds-react";
import { useId, useRef, useState } from "react";
import { MAKS_KOMMENTARLENGDE } from "./typer";

/**
 * Skjema for én kommentar. Formatet er ren tekst med linjeskift – ingen
 * rik formatering – fordi kommentarer skal kunne vises identisk i backend,
 * i varsler og i eventuelle eksporter.
 *
 * Utkastet ligger i komponentens egen state og nullstilles **kun** ved suksess.
 * Feiler lagringen (inkludert 409-konflikt) beholdes teksten, slik at
 * saksbehandleren ikke mister arbeidet sitt.
 */
export function KommentarSkjema({
  etikett,
  knappetekst,
  startverdi = "",
  autoFokus = false,
  sender = false,
  onLagre,
  onAvbryt,
}: {
  etikett: string;
  knappetekst: string;
  startverdi?: string;
  autoFokus?: boolean;
  sender?: boolean;
  onLagre: (tekst: string) => Promise<boolean>;
  onAvbryt?: () => void;
}) {
  const [verdi, settVerdi] = useState(startverdi);
  const [feil, settFeil] = useState<string | null>(null);
  const feltId = useId();
  const feltRef = useRef<HTMLTextAreaElement>(null);

  async function håndterSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmet = verdi.trim();
    if (trimmet.length === 0) {
      settFeil("Skriv en kommentar før du lagrer.");
      feltRef.current?.focus();
      return;
    }
    if (trimmet.length > MAKS_KOMMENTARLENGDE) {
      settFeil(`Kommentaren kan ikke være lengre enn ${MAKS_KOMMENTARLENGDE} tegn.`);
      feltRef.current?.focus();
      return;
    }

    settFeil(null);
    const ok = await onLagre(trimmet);
    if (ok) {
      settVerdi("");
    } else {
      feltRef.current?.focus();
    }
  }

  return (
    <form onSubmit={håndterSubmit} className="w-full">
      <VStack gap="space-8">
        <Textarea
          ref={feltRef}
          id={feltId}
          label={etikett}
          size="small"
          minRows={2}
          maxLength={MAKS_KOMMENTARLENGDE}
          autoFocus={autoFokus}
          value={verdi}
          error={feil ?? undefined}
          onChange={(event) => settVerdi(event.target.value)}
          onKeyDown={(event) => {
            // Escape lukker skjemaet uten å lagre – raskt å komme seg ut med tastaturet.
            if (event.key === "Escape" && onAvbryt) {
              event.stopPropagation();
              onAvbryt();
            }
          }}
        />
        <HStack gap="space-8">
          <Button type="submit" size="small" variant="primary" loading={sender}>
            {knappetekst}
          </Button>
          {onAvbryt && (
            <Button type="button" size="small" variant="tertiary" onClick={onAvbryt}>
              Avbryt
            </Button>
          )}
        </HStack>
      </VStack>
    </form>
  );
}
