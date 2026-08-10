import { PlusCircleIcon, TagIcon } from "@navikt/aksel-icons";
import { BodyShort, Heading, TextField, VStack } from "@navikt/ds-react";
import { useMemo, useState } from "react";
import { STANDARD_VARIABLER, type VariabelId } from "./variabel-typer";

type VariabelListeProps = {
  onSettInn: (variabelId: VariabelId) => void;
  disabled?: boolean;
};

/** Søkbart sidepanel med variablene som kan settes inn i dokumentet. */
export function VariabelListe({ onSettInn, disabled }: VariabelListeProps) {
  const [søketekst, settSøketekst] = useState("");
  const variabler = useMemo(() => {
    const søk = søketekst.trim().toLocaleLowerCase("nb-NO");
    if (!søk) return STANDARD_VARIABLER;
    return STANDARD_VARIABLER.filter(({ etikett, beskrivelse }) =>
      `${etikett} ${beskrivelse}`.toLocaleLowerCase("nb-NO").includes(søk),
    );
  }, [søketekst]);

  return (
    <>
      <VStack gap="space-2">
        <Heading level="2" size="xsmall">
          Variabler
        </Heading>
        <BodyShort size="small" className="text-ax-text-neutral-subtle">
          Klikk for å sette inn i dokumentet
        </BodyShort>
      </VStack>
      <TextField
        label="Søk i variabler"
        hideLabel
        size="small"
        value={søketekst}
        onChange={(event) => settSøketekst(event.target.value)}
        placeholder="Søk i variabler …"
        className="w-full"
      />
      <div className="-mx-[var(--ax-space-16)] -mb-[var(--ax-space-16)]">
        {variabler.map(({ id, etikett, beskrivelse }) => (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => onSettInn(id)}
            className="flex w-full items-center justify-between gap-[var(--ax-space-8)] border-t border-ax-border-neutral-subtle px-[var(--ax-space-16)] py-[var(--ax-space-8)] text-left hover:bg-ax-bg-neutral-soft disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ax-border-focus"
            aria-label={`Sett inn variabelen ${etikett}`}
          >
            <span className="min-w-0">
              <span className="inline-flex items-center gap-1 rounded border border-[#c0d6e4] bg-[#eaf2fa] px-1.5 py-0.5 text-sm font-semibold text-ax-text-accent-subtle">
                <TagIcon aria-hidden fontSize="1rem" />
                {etikett}
              </span>
              <span className="block text-sm text-ax-text-neutral-subtle">{beskrivelse}</span>
            </span>
            <PlusCircleIcon
              aria-hidden
              className="shrink-0 text-ax-text-accent-subtle"
              fontSize="1.375rem"
            />
          </button>
        ))}
        {variabler.length === 0 && (
          <BodyShort size="small" className="px-[var(--ax-space-16)] py-[var(--ax-space-8)]">
            Ingen variabler passer søket.
          </BodyShort>
        )}
      </div>
    </>
  );
}
