import { DocPencilIcon, FolderIcon } from "@navikt/aksel-icons";
import type { DokumentNode } from "./typer";

/** Ikon for en dokument- eller mappenode i dokumenttreet. */
export function DokumentIkon({
  node,
  ...props
}: { node: DokumentNode } & React.SVGProps<SVGSVGElement>) {
  if (node.type === "mappe") {
    return <FolderIcon {...props} />;
  }
  return <DocPencilIcon {...props} />;
}
