import { Heading } from "@navikt/ds-react";

type DokumentTittelProps = {
  tittel: string;
  redigerbar: boolean;
  onEndre: (tittel: string) => void;
};

/** Inline tittelredigering øverst i editoren. Tittelen er sidens `h1`. */
export function DokumentTittel({ tittel, redigerbar, onEndre }: DokumentTittelProps) {
  if (!redigerbar) {
    return (
      <Heading level="1" size="large">
        {tittel || "Uten tittel"}
      </Heading>
    );
  }

  return (
    <input
      type="text"
      value={tittel}
      onChange={(event) => onEndre(event.target.value)}
      aria-label="Dokumenttittel"
      placeholder="Uten tittel"
      className="w-full border-0 bg-transparent p-0 font-bold text-3xl leading-tight text-ax-text-default placeholder:text-ax-text-neutral-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-ax-border-focus rounded-sm"
    />
  );
}
