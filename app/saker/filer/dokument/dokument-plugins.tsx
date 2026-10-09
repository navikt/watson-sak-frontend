import {
  BlockquotePlugin,
  BoldPlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  ItalicPlugin,
  StrikethroughPlugin,
  UnderlinePlugin,
} from "@platejs/basic-nodes/react";
import { BulletedListPlugin, NumberedListPlugin } from "@platejs/list-classic/react";
import { IndentPlugin } from "@platejs/indent/react";
import { DocxPlugin } from "@platejs/docx";
import { JuicePlugin } from "@platejs/juice";
import { ImagePlugin } from "@platejs/media/react";
import { TrailingBlockPlugin } from "platejs";
import {
  TableCellHeaderPlugin,
  TableCellPlugin,
  TablePlugin,
  TableRowPlugin,
} from "@platejs/table/react";
import { ParagraphPlugin, PlateElement } from "platejs/react";
import type { PlateElementProps } from "platejs/react";
import type { TElement } from "platejs";
import { NodeIdPlugin } from "platejs";
import { BildeElement } from "./BildeElement";
import { KommentarMarkeringLeaf, KommentarMarkeringPlugin } from "./kommentarer/KommentarMarkering";
import { VariabelElement } from "./variabler/VariabelElement";
import { VariabelPlugin } from "./variabler/VariabelPlugin";

type HorisontalJustering = "left" | "center" | "right";
type JusterbartElement = TElement & {
  justering?: HorisontalJustering;
  bevarLinjeskift?: boolean;
};

function justeringsstil(element: JusterbartElement) {
  return {
    textAlign: element.justering,
    whiteSpace: element.bevarLinjeskift ? "pre-line" : undefined,
  };
}

function JustertAvsnitt({ children, element, ...props }: PlateElementProps<JusterbartElement>) {
  return (
    <PlateElement as="p" {...props} element={element} style={justeringsstil(element)}>
      {children}
    </PlateElement>
  );
}

function JustertOverskrift1({ children, element, ...props }: PlateElementProps<JusterbartElement>) {
  return (
    <PlateElement as="h1" {...props} element={element} style={justeringsstil(element)}>
      {children}
    </PlateElement>
  );
}

function JustertOverskrift2({ children, element, ...props }: PlateElementProps<JusterbartElement>) {
  return (
    <PlateElement as="h2" {...props} element={element} style={justeringsstil(element)}>
      {children}
    </PlateElement>
  );
}

function JustertOverskrift3({ children, element, ...props }: PlateElementProps<JusterbartElement>) {
  return (
    <PlateElement as="h3" {...props} element={element} style={justeringsstil(element)}>
      {children}
    </PlateElement>
  );
}

function JustertSitat({ children, element, ...props }: PlateElementProps<JusterbartElement>) {
  return (
    <PlateElement as="blockquote" {...props} element={element} style={justeringsstil(element)}>
      {children}
    </PlateElement>
  );
}

export const PLUGINS = [
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  IndentPlugin,
  // ParagraphPlugin mangler egen render.as-konfigurasjon (i motsetning til
  // heading-pluginene), så vi må selv be den rendre som ekte <p>-tag.
  ParagraphPlugin.withComponent(JustertAvsnitt),
  H1Plugin.withComponent(JustertOverskrift1),
  H2Plugin.withComponent(JustertOverskrift2),
  H3Plugin.withComponent(JustertOverskrift3),
  BlockquotePlugin.withComponent(JustertSitat),
  BulletedListPlugin,
  NumberedListPlugin,
  // Håndterer lim inn fra Word: DocxPlugin konverterer DOCX-utklipp til Plate-format,
  // JuicePlugin inliner CSS-stiler i utklippet så formateringen bevares ved konverteringen.
  DocxPlugin,
  JuicePlugin,
  TrailingBlockPlugin.configure({ options: { type: "p" } }),
  TablePlugin.withComponent(({ children, ...props }: PlateElementProps) => (
    <PlateElement as="table" {...props}>
      <tbody>{children}</tbody>
    </PlateElement>
  )),
  TableRowPlugin.withComponent(({ children, ...props }: PlateElementProps) => (
    <PlateElement as="tr" {...props}>
      {children}
    </PlateElement>
  )),
  TableCellPlugin.withComponent(({ children, ...props }: PlateElementProps) => (
    <PlateElement as="td" {...props}>
      {children}
    </PlateElement>
  )),
  TableCellHeaderPlugin.withComponent(({ children, ...props }: PlateElementProps) => (
    <PlateElement as="th" {...props}>
      {children}
    </PlateElement>
  )),
  ImagePlugin.withComponent(BildeElement),
  VariabelPlugin.withComponent(VariabelElement),
  // Gir blokkene stabile IDer, som er det sterkeste holdepunktet for
  // kommentarankere. Dokumenter uten IDer fungerer fortsatt – da faller
  // ankermotoren tilbake på sti og sitat.
  NodeIdPlugin.configure({ options: { initialValueIds: "always" } }),
  KommentarMarkeringPlugin.withComponent(KommentarMarkeringLeaf),
];
