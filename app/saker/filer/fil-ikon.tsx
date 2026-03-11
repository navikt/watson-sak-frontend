import {
  FileCodeIcon,
  FileCsvIcon,
  FileExcelIcon,
  FileIcon,
  FileImageIcon,
  FilePdfIcon,
  FileTextIcon,
  FileWordIcon,
  FolderIcon,
  PresentationIcon,
} from "@navikt/aksel-icons";
import type { FilNode, FilType } from "./typer";

const filTypeIkoner: Record<FilType, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  word: FileWordIcon,
  excel: FileExcelIcon,
  pdf: FilePdfIcon,
  powerpoint: PresentationIcon,
  bilde: FileImageIcon,
  csv: FileCsvIcon,
  json: FileCodeIcon,
  kode: FileCodeIcon,
  tekst: FileTextIcon,
  annet: FileIcon,
};

export function FilIkon({ node, ...props }: { node: FilNode } & React.SVGProps<SVGSVGElement>) {
  if (node.type === "mappe") {
    return <FolderIcon {...props} />;
  }
  const Ikon = filTypeIkoner[node.format];
  return <Ikon {...props} />;
}
