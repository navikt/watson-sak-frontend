import { ChevronDownIcon, FolderIcon } from "@navikt/aksel-icons";
import { Heading, HStack, VStack } from "@navikt/ds-react";
import { useState, type ReactNode } from "react";
import type { KontrollsakResponse } from "~/saker/types.backend";
import { getMineSakerGruppeStatus } from "~/saker/selectors";
import { mapKontrollsakTilSakslisteRad } from "~/saker/saksliste/adaptere";
import { Saksliste } from "~/saker/saksliste/Saksliste";

type SakGrupper = {
  aktive: KontrollsakResponse[];
  ventende: KontrollsakResponse[];
  fullførte: KontrollsakResponse[];
};

export function MineSakerInnhold({
  saker,
  detaljSti,
}: {
  saker: KontrollsakResponse[];
  detaljSti: string;
}) {
  const [viserVentende, setViserVentende] = useState(false);
  const [viserFullførte, setViserFullførte] = useState(false);
  const grupper = grupperSaker(saker);

  return (
    <section aria-labelledby="mine-saker-overskrift" className="pb-12">
      <HStack gap="space-4" align="center" className="mt-6 mb-6">
        <FolderIcon aria-hidden fontSize="1.25rem" className="text-ax-text-neutral" />
        <Heading id="mine-saker-overskrift" level="1" size="medium">
          Mine saker
        </Heading>
      </HStack>

      <VStack gap="space-8">
        <Heading level="2" size="small" className="sr-only">
          Aktive saker
        </Heading>
        <SakGrid
          saker={grupper.aktive}
          detaljSti={detaljSti}
          tomTekst="Du har ingen aktive saker."
        />

        <SammenleggbarSeksjon
          tittel="Oppgaver på vent"
          erÅpen={viserVentende}
          toggle={() => setViserVentende((åpen) => !åpen)}
        >
          <SakGrid
            saker={grupper.ventende}
            detaljSti={detaljSti}
            tomTekst="Du har ingen saker som venter."
          />
        </SammenleggbarSeksjon>

        <SammenleggbarSeksjon
          tittel="Fullførte oppgaver"
          erÅpen={viserFullførte}
          toggle={() => setViserFullførte((åpen) => !åpen)}
        >
          <SakGrid
            saker={grupper.fullførte}
            detaljSti={detaljSti}
            tomTekst="Du har ingen fullførte saker."
          />
        </SammenleggbarSeksjon>
      </VStack>
    </section>
  );
}

function grupperSaker(saker: KontrollsakResponse[]): SakGrupper {
  return {
    aktive: saker.filter((sak) => getMineSakerGruppeStatus(sak) === "aktive"),
    ventende: saker.filter((sak) => getMineSakerGruppeStatus(sak) === "ventende"),
    fullførte: saker.filter((sak) => getMineSakerGruppeStatus(sak) === "fullførte"),
  };
}

function SakGrid({
  saker,
  detaljSti,
  tomTekst,
}: {
  saker: KontrollsakResponse[];
  detaljSti: string;
  tomTekst: string;
}) {
  return (
    <Saksliste
      rader={saker.map((sak) => mapKontrollsakTilSakslisteRad(sak, detaljSti))}
      tomTekst={tomTekst}
    />
  );
}

function SammenleggbarSeksjon({
  tittel,
  erÅpen,
  toggle,
  children,
}: {
  tittel: string;
  erÅpen: boolean;
  toggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <Heading level="2" size="small">
        <button
          type="button"
          onClick={toggle}
          aria-expanded={erÅpen}
          className="flex items-center gap-3 rounded-md border-none bg-transparent p-0 text-left text-ax-text-neutral hover:text-ax-text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ax-border-accent"
        >
          {tittel}
          <ChevronDownIcon
            aria-hidden
            fontSize="1.25rem"
            className={`transition-transform duration-200 ${erÅpen ? "rotate-180" : ""}`}
          />
        </button>
      </Heading>

      {erÅpen && children}
    </section>
  );
}
