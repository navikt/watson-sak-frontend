import { PencilIcon } from "@navikt/aksel-icons";
import { Button, Tooltip } from "@navikt/ds-react";

interface ResponsivEndreKnappProps {
  ariaLabel: string;
  onClick: () => void;
}

export function ResponsivEndreKnapp({ ariaLabel, onClick }: ResponsivEndreKnappProps) {
  return (
    <Tooltip content={ariaLabel}>
      <Button
        type="button"
        variant="tertiary"
        size="xsmall"
        icon={<PencilIcon aria-hidden />}
        aria-label={ariaLabel}
        onClick={onClick}
      >
        <span className="hidden xl:inline">Endre</span>
      </Button>
    </Tooltip>
  );
}
