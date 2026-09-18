import {
  ChatIcon,
  ChevronDownIcon,
  ClockIcon,
  FilePdfIcon,
  FilesIcon,
  SidebarRightIcon,
  TagIcon,
} from "@navikt/aksel-icons";
import { ActionMenu, Button, Heading, HStack, Tag, VStack } from "@navikt/ds-react";
import type { ComponentType, ReactNode } from "react";

export type SidepanelValg =
  | "dokumenter"
  | "variabler"
  | "historikk"
  | "kommentarer"
  | "forhåndsvisning";

export const STANDARD_SIDEPANEL: SidepanelValg = "dokumenter";

type Sidepanelvalg = {
  verdi: SidepanelValg;
  etikett: string;
  ikon: ComponentType<{ "aria-hidden"?: boolean }>;
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
  },
  {
    verdi: "kommentarer",
    etikett: "Kommentarer",
    ikon: ChatIcon,
  },
  {
    verdi: "forhåndsvisning",
    etikett: "Forhåndsvisning",
    ikon: FilePdfIcon,
  },
];

function finnValg(verdi: SidepanelValg): Sidepanelvalg {
  return SIDEPANELER.find((valg) => valg.verdi === verdi) ?? SIDEPANELER[0];
}

type SidepanelMenyProps = {
  aktivt: SidepanelValg;
  onVelg: (valg: SidepanelValg) => void;
  /** Antall uløste kommentarer. Vises som badge på «Kommentarer». */
  antallKommentarer?: number;
};

/** Velger hva sidepanelet ved siden av dokumentet skal vise. */
export function SidepanelMeny({ aktivt, onVelg, antallKommentarer = 0 }: SidepanelMenyProps) {
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
            {antallKommentarer > 0 && valgt.verdi !== "kommentarer" && (
              <Tag variant="warning" size="xsmall">
                {antallKommentarer}
              </Tag>
            )}
          </HStack>
        </Button>
      </ActionMenu.Trigger>
      <ActionMenu.Content>
        <ActionMenu.Group label="Vis i sidepanelet">
          {SIDEPANELER.map(({ verdi, etikett, ikon: Ikon }) => (
            <ActionMenu.Item key={verdi} icon={<Ikon aria-hidden />} onSelect={() => onVelg(verdi)}>
              <HStack as="span" gap="space-8" align="center" wrap={false}>
                {etikett}
                {verdi === "kommentarer" && antallKommentarer > 0 && (
                  <Tag variant="warning" size="xsmall">
                    {antallKommentarer} uløste
                  </Tag>
                )}
              </HStack>
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
  /** Innholdet for «Historikk». */
  historikkInnhold: ReactNode;
  /** Innholdet for «Kommentarer». */
  kommentarInnhold?: ReactNode;
  /** Innholdet for «Forhåndsvisning». */
  forhåndsvisningInnhold?: ReactNode;
  /** Lagrestatusen, som ligger nederst i panelet. Eies av siden som gjør lagringen. */
  lagreStatus?: ReactNode;
};

/** Sidepanelet til høyre for dokumentet. Egen fullhøyde-seksjon, resizable via
 * skillelinjen mellom editoren og panelet – ikke et kort oppå det grå. */
export function Sidepanel({
  aktivt,
  dokumentliste,
  variabelInnhold,
  historikkInnhold,
  kommentarInnhold,
  forhåndsvisningInnhold,
  lagreStatus,
}: SidepanelProps) {
  const valg = finnValg(aktivt);
  const innhold =
    aktivt === "dokumenter"
      ? dokumentliste
      : aktivt === "variabler"
        ? variabelInnhold
        : aktivt === "historikk"
          ? historikkInnhold
          : aktivt === "kommentarer"
            ? kommentarInnhold
            : forhåndsvisningInnhold;

  return (
    <aside className="flex w-full shrink-0 flex-col gap-[var(--ax-space-12)] overflow-hidden border-t border-ax-border-neutral-subtle bg-ax-bg-default px-[var(--ax-space-16)] pt-0 pb-[var(--ax-space-16)] lg:min-w-0 lg:flex-1 lg:border-t-0 lg:pl-0">
      <VStack
        gap="space-12"
        className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-ax-border-neutral-subtle bg-ax-bg-default p-[var(--ax-space-16)]"
      >
        {aktivt !== "variabler" && aktivt !== "forhåndsvisning" && (
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
