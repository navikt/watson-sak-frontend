import {
  ChevronDownIcon,
  ClockIcon,
  FilesIcon,
  SidebarRightIcon,
  TagIcon,
} from "@navikt/aksel-icons";
import { ActionMenu, BodyShort, Button, Heading, HStack, VStack } from "@navikt/ds-react";
import type { ComponentType, ReactNode } from "react";

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

  return (
    <ActionMenu>
      <ActionMenu.Trigger>
        <Button
          type="button"
          variant="secondary"
          data-color="accent"
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
        <ActionMenu.Group label="Vis i sidepanelet">
          {SIDEPANELER.map(({ verdi, etikett, ikon: Ikon }) => (
            <ActionMenu.Item key={verdi} icon={<Ikon aria-hidden />} onSelect={() => onVelg(verdi)}>
              {etikett}
            </ActionMenu.Item>
          ))}
        </ActionMenu.Group>
      </ActionMenu.Content>
    </ActionMenu>
  );
}

type SidepanelProps = {
  aktivt: SidepanelValg;
  /** Innholdet for «Dokumenter». Sendes inn fordi dokumenttreet eies av siden. */
  dokumentliste: ReactNode;
  /** Lagrestatusen, som ligger nederst i panelet. Eies av siden som gjør lagringen. */
  lagreStatus?: ReactNode;
};

/** Sidepanelet til høyre for dokumentet. Egen fullhøyde-seksjon, ikke et kort oppå det grå. */
export function Sidepanel({ aktivt, dokumentliste, lagreStatus }: SidepanelProps) {
  const valg = finnValg(aktivt);

  return (
    <aside className="flex w-full shrink-0 flex-col gap-[var(--ax-space-12)] border-t border-ax-border-neutral-subtle bg-ax-bg-default p-[var(--ax-space-16)] lg:w-[400px] lg:border-t-0">
      {/* Panelet følger med når man scroller. `top` klarerer den festede verktøylinja. */}
      <VStack
        gap="space-12"
        className="rounded-lg border border-ax-border-neutral-subtle bg-ax-bg-default p-[var(--ax-space-16)] lg:sticky lg:top-[70px] lg:max-h-[calc(100vh-var(--ax-space-96))] lg:overflow-y-auto"
      >
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

      {/* Lagrestatusen hører hjemme nederst i panelet, men skal være synlig hele veien –
      derfor festes den til bunnen av visningsområdet til man scroller helt ned. */}
      {lagreStatus && (
        <div className="mt-auto shrink-0 lg:sticky lg:bottom-0 lg:pb-[var(--ax-space-4)]">
          {lagreStatus}
        </div>
      )}
    </aside>
  );
}
