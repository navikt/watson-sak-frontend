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
  /** Innholdet for «Variabler». Sendes inn fordi innsetting eies av editoren. */
  variabelInnhold: ReactNode;
  /** Lagrestatusen, som ligger nederst i panelet. Eies av siden som gjør lagringen. */
  lagreStatus?: ReactNode;
};

/** Sidepanelet til høyre for dokumentet. Egen fullhøyde-seksjon, ikke et kort oppå det grå. */
export function Sidepanel({ aktivt, dokumentliste, variabelInnhold, lagreStatus }: SidepanelProps) {
  const valg = finnValg(aktivt);
  const innhold =
    aktivt === "dokumenter" ? (
      dokumentliste
    ) : aktivt === "variabler" ? (
      variabelInnhold
    ) : (
      <BodyShort size="small" className="text-ax-text-neutral-subtle">
        {valg.kommerSnart}
      </BodyShort>
    );

  return (
    <aside className="flex w-full shrink-0 flex-col gap-[var(--ax-space-12)] overflow-hidden border-t border-ax-border-neutral-subtle bg-ax-bg-default px-[var(--ax-space-16)] pt-0 pb-[var(--ax-space-16)] lg:w-[400px] lg:border-t-0">
      <VStack
        gap="space-12"
        className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-ax-border-neutral-subtle bg-ax-bg-default p-[var(--ax-space-16)]"
      >
        {aktivt !== "variabler" && (
          <Heading level="2" size="xsmall">
            {valg.etikett}
          </Heading>
        )}
        {innhold}
      </VStack>

      {lagreStatus && <div className="shrink-0">{lagreStatus}</div>}
    </aside>
  );
}
