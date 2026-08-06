import {
  ChevronDownIcon,
  ClockIcon,
  FilesIcon,
  SidebarRightIcon,
  TagIcon,
} from "@navikt/aksel-icons";
import { ActionMenu, BodyShort, Button, Heading, HStack, VStack } from "@navikt/ds-react";
import type { ComponentType, ReactNode } from "react";
import { useState } from "react";
import { Kort } from "~/komponenter/Kort";

export type SidepanelValg = "dokumenter" | "variabler" | "historikk";

export const STANDARD_SIDEPANEL: SidepanelValg = "dokumenter";

type Sidepanelvalg = {
  verdi: SidepanelValg;
  etikett: string;
  ikon: ComponentType<{ "aria-hidden"?: boolean }>;
  /** Tekst som vises i panelet så lenge innholdet ikke er bygget ennå. */
  kommerSnart?: string;
};

const SIDEPANELER: Sidepanelvalg[] = [
  { verdi: "dokumenter", etikett: "Dokumenter", ikon: FilesIcon },
  {
    verdi: "variabler",
    etikett: "Variabler",
    ikon: TagIcon,
    kommerSnart: "Her kan du snart sette inn variabler som fylles ut automatisk i dokumentet.",
  },
  {
    verdi: "historikk",
    etikett: "Historikk",
    ikon: ClockIcon,
    kommerSnart: "Her kan du snart se hvem som har endret dokumentet, og når.",
  },
];

function finnValg(verdi: SidepanelValg): Sidepanelvalg {
  return SIDEPANELER.find((valg) => valg.verdi === verdi) ?? SIDEPANELER[0];
}

type SidepanelMenyProps = {
  aktivt: SidepanelValg;
  onVelg: (valg: SidepanelValg) => void;
};

/** Velger hva sidepanelet ved siden av dokumentet skal vise. */
export function SidepanelMeny({ aktivt, onVelg }: SidepanelMenyProps) {
  const valgt = finnValg(aktivt);
  // Radioelementer lukker ikke menyen av seg selv. Her velger man én ting og er ferdig,
  // så vi styrer åpen-tilstanden og lukker etter valg – ellers dekker menyen panelet.
  const [åpen, settÅpen] = useState(false);

  return (
    <ActionMenu open={åpen} onOpenChange={settÅpen}>
      <ActionMenu.Trigger>
        <Button
          type="button"
          variant="tertiary"
          size="small"
          icon={<ChevronDownIcon aria-hidden />}
          iconPosition="right"
        >
          <HStack as="span" gap="space-8" align="center" wrap={false}>
            <SidebarRightIcon aria-hidden />
            {valgt.etikett}
          </HStack>
        </Button>
      </ActionMenu.Trigger>
      <ActionMenu.Content>
        <ActionMenu.RadioGroup
          label="Vis i sidepanelet"
          value={aktivt}
          onValueChange={(verdi) => {
            onVelg(verdi as SidepanelValg);
            settÅpen(false);
          }}
        >
          {SIDEPANELER.map(({ verdi, etikett, ikon: Ikon }) => (
            <ActionMenu.RadioItem key={verdi} value={verdi}>
              <HStack gap="space-8" align="center">
                <Ikon aria-hidden />
                {etikett}
              </HStack>
            </ActionMenu.RadioItem>
          ))}
        </ActionMenu.RadioGroup>
      </ActionMenu.Content>
    </ActionMenu>
  );
}

type SidepanelProps = {
  aktivt: SidepanelValg;
  /** Innholdet for «Dokumenter». Sendes inn fordi dokumenttreet eies av siden. */
  dokumentliste: ReactNode;
};

/** Sidepanelet til høyre for dokumentet. */
export function Sidepanel({ aktivt, dokumentliste }: SidepanelProps) {
  const valg = finnValg(aktivt);

  return (
    <Kort
      as="aside"
      padding="space-16"
      // Panelet følger med når man scroller. `top` klarerer den festede verktøylinja.
      className="w-full shrink-0 shadow-[var(--ax-shadow-dialog)] lg:sticky lg:top-[70px] lg:w-[340px]"
    >
      <VStack gap="space-12">
        <Heading level="2" size="xsmall">
          {valg.etikett}
        </Heading>
        {valg.kommerSnart ? (
          <BodyShort size="small" className="text-ax-text-neutral-subtle">
            {valg.kommerSnart}
          </BodyShort>
        ) : (
          dokumentliste
        )}
      </VStack>
    </Kort>
  );
}
