import { DragVerticalIcon, TrashIcon } from "@navikt/aksel-icons";
import { Button, Tooltip } from "@navikt/ds-react";
import { Resizable, ResizableProvider, ResizeHandle } from "@platejs/resizable";
import { PlateElement, useEditorReadOnly } from "platejs/react";
import type { PlateElementProps } from "platejs/react";
import type { TElement } from "platejs";
import { useState } from "react";
import { BILDE_FLYTT_MIMETYPE } from "./bilde-opplasting";

/** Bildenode i dokumentinnholdet. Opplastede bilder har `filId` til vedlegget; statiske assets har ikke det. */
export type BildeElementType = TElement & {
  filId?: string;
  url: string;
  alt?: string;
  width?: number;
  erStatisk?: boolean;
};

const MINSTE_BREDDE = 80;

/** Usynlig, men klikkbar gripe-kant langs bildekanten for å endre bredde. */
function Håndtak({ retning }: { retning: "left" | "right" }) {
  return (
    <ResizeHandle
      options={{ direction: retning }}
      className={
        "absolute top-0 h-full w-3 cursor-col-resize opacity-0 hover:opacity-100 " +
        "hover:bg-ax-bg-accent-strong/40 " +
        (retning === "left" ? "-left-1.5" : "-right-1.5")
      }
    />
  );
}

/**
 * Rendrer et bilde satt inn i dokumentet. Bildet er en «void»-node (ingen redigerbar
 * tekst) og kan dra-endres i bredde via håndtakene fra `@platejs/resizable`. Selve
 * bildedataene ligger ikke i dokumentet — `url` peker til det vanlige vedleggs-API-et,
 * så bildet er også synlig som et ordinært vedlegg på saken.
 */
export function BildeElement(props: PlateElementProps<BildeElementType>) {
  const { editor, element, path } = props;
  const [visSlettbekreftelse, settVisSlettbekreftelse] = useState(false);
  const readOnly = useEditorReadOnly();

  if (element.erStatisk) {
    return (
      <PlateElement {...props}>
        <img
          src={element.url}
          alt={element.alt ?? ""}
          width={100}
          height={63}
          className="h-auto max-w-full"
          contentEditable={false}
          draggable={false}
        />
        {props.children}
      </PlateElement>
    );
  }

  return (
    <PlateElement {...props} className="my-2">
      <figure contentEditable={false} className="group relative m-0 inline-block max-w-full">
        {/* Egen ResizableProvider per bilde, slik at hvert bildes bredde-state er isolert
        – uten denne deler alle bilder i dokumentet samme globale bredde-atom. */}
        <ResizableProvider>
          <Resizable
            options={{ align: "left", minWidth: MINSTE_BREDDE, maxWidth: "100%", readOnly }}
          >
            {!readOnly && <Håndtak retning="left" />}
            <img
              src={element.url}
              alt={element.alt ?? ""}
              className="block h-auto w-full rounded-md border border-ax-border-neutral-subtle"
              draggable={false}
            />
            {!readOnly && <Håndtak retning="right" />}
          </Resizable>
        </ResizableProvider>
        {!readOnly && (
          <div
            className="absolute top-2 left-2 flex cursor-grab items-center justify-center rounded-md bg-ax-bg-neutral-strong/80 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 active:cursor-grabbing"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData(BILDE_FLYTT_MIMETYPE, JSON.stringify(path));
            }}
          >
            <Tooltip content="Flytt bilde">
              <Button
                type="button"
                variant="primary"
                data-color="neutral"
                size="small"
                icon={<DragVerticalIcon aria-hidden />}
                aria-label="Flytt bilde opp eller ned i dokumentet"
                tabIndex={-1}
              />
            </Tooltip>
          </div>
        )}
        {!readOnly && (
          <div className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <Tooltip content="Fjern bilde">
              <Button
                type="button"
                variant="primary"
                size="small"
                icon={<TrashIcon aria-hidden />}
                aria-label="Fjern bilde fra dokumentet"
                onClick={() => settVisSlettbekreftelse(true)}
              />
            </Tooltip>
          </div>
        )}
        {visSlettbekreftelse && (
          <div className="absolute inset-0 flex items-center justify-center gap-[var(--ax-space-8)] rounded-md bg-ax-bg-neutral-strong/80">
            <Button
              type="button"
              size="small"
              variant="primary"
              data-color="danger"
              onClick={() => editor.tf.removeNodes({ at: path })}
            >
              Fjern bilde
            </Button>
            <Button
              type="button"
              size="small"
              variant="primary"
              data-color="neutral"
              onClick={() => settVisSlettbekreftelse(false)}
            >
              Avbryt
            </Button>
          </div>
        )}
      </figure>
      {props.children}
    </PlateElement>
  );
}
