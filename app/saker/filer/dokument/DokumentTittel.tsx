import { Heading } from "@navikt/ds-react";
import { useEffect, useRef } from "react";

type DokumentTittelProps = {
  tittel: string;
  redigerbar: boolean;
  onEndre: (tittel: string) => void;
};

const STANDARDTITTEL = "Uten tittel";

/** Inline tittelredigering øverst i editoren. Tittelen er sidens `h1`. */
export function DokumentTittel({ tittel, redigerbar, onEndre }: DokumentTittelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  // Fang opp ved montering (komponenten remountes per dokument via key={docId}):
  // et nytt/utitelt dokument skal fokusere tittelfeltet så man kan skrive med en gang.
  const skalAutofokusere = useRef(redigerbar && tittel === STANDARDTITTEL);

  useEffect(() => {
    if (skalAutofokusere.current) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, []);

  if (!redigerbar) {
    return (
      <Heading level="1" size="large">
        {tittel || STANDARDTITTEL}
      </Heading>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={tittel}
      onChange={(event) => onEndre(event.target.value)}
      aria-label="Dokumenttittel"
      placeholder={STANDARDTITTEL}
      className="w-full border-0 bg-transparent p-0 font-bold text-3xl leading-tight text-ax-text-default placeholder:text-ax-text-neutral-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-ax-border-focus rounded-sm"
    />
  );
}
