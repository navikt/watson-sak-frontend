import { MenuElipsisVerticalIcon } from "@navikt/aksel-icons";
import { ActionMenu, Button } from "@navikt/ds-react";
import type { MouseEvent, ReactNode } from "react";

/**
 * Lager en `onContextMenu`-handler som åpner elementmenyen ved høyreklikk på raden, eller med
 * menytasten / Shift+F10. Høyreklikk på lenker beholder nettleserens egen meny, slik at
 * «Åpne i ny fane» fortsatt virker.
 */
export function kontekstmeny(åpne: () => void) {
  return (event: MouseEvent<HTMLElement>) => {
    if (event.target instanceof Element && event.target.closest("a")) return;
    event.preventDefault();
    åpne();
  };
}

interface ElementmenyProps {
  /** Tilgjengelig navn på menyknappen, f.eks. «Handlinger for mappen Bank». */
  label: string;
  åpen: boolean;
  onOpenChange: (åpen: boolean) => void;
  /** `ActionMenu.Item`-er. */
  children: ReactNode;
}

/**
 * Prikkemeny for en rad i mappetreet. Med mus vises knappen bare når raden holdes over, har fokus
 * eller menyen er åpen. Raden må ha klassen `group/rad`. På berøringsskjerm vises knappen alltid.
 */
export function Elementmeny({ label, åpen, onOpenChange, children }: ElementmenyProps) {
  return (
    <ActionMenu open={åpen} onOpenChange={onOpenChange}>
      <ActionMenu.Trigger>
        <Button
          type="button"
          variant="tertiary-neutral"
          size="xsmall"
          icon={<MenuElipsisVerticalIcon aria-hidden />}
          aria-label={label}
          className={
            åpen
              ? undefined
              : "pointer-fine:opacity-0 group-hover/rad:opacity-100 group-focus-within/rad:opacity-100"
          }
        />
      </ActionMenu.Trigger>
      <ActionMenu.Content>{children}</ActionMenu.Content>
    </ActionMenu>
  );
}
