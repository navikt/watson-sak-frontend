import {
  ArrowDownIcon,
  ArrowsUpDownIcon,
  ArrowUpIcon,
} from "@navikt/aksel-icons";

export type Sorteringsretning = "stigende" | "synkende";

type KolonneHeadingProps = {
  tittel: string;
  sortering?: {
    aktiv: boolean;
    retning: Sorteringsretning | null;
    onSort: () => void;
  };
};

export function KolonneHeading({ tittel, sortering }: KolonneHeadingProps) {
  if (!sortering) {
    return <span className="text-sm font-semibold">{tittel}</span>;
  }

  return (
    <button
      type="button"
      onClick={sortering.onSort}
      aria-label={`Sorter på ${tittel.toLowerCase()}`}
      className="inline-flex cursor-pointer items-center gap-1 border-none bg-transparent px-2 text-left text-sm font-semibold text-ax-text-neutral hover:text-ax-text-accent focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ax-border-accent"
    >
      <span>{tittel}</span>
      <SorteringsIkon aktiv={sortering.aktiv} retning={sortering.retning} />
    </button>
  );
}

function SorteringsIkon({
  aktiv,
  retning,
}: {
  aktiv: boolean;
  retning: Sorteringsretning | null;
}) {
  if (!aktiv || retning === null) {
    return (
      <ArrowsUpDownIcon
        aria-hidden
        fontSize="1rem"
        className="text-ax-text-neutral-subtle"
      />
    );
  }

  const Ikon = retning === "stigende" ? ArrowUpIcon : ArrowDownIcon;
  return <Ikon aria-hidden fontSize="1rem" className="text-ax-text-accent" />;
}
