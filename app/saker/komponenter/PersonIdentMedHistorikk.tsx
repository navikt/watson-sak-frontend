import { ClockIcon } from "@navikt/aksel-icons";
import { Button, CopyButton, HStack, Tooltip } from "@navikt/ds-react";
import { formaterFødselsnummer } from "~/utils/string-utils";

interface PersonIdentMedHistorikkProps {
  personIdent: string;
  harHistorikk: boolean;
  onVisHistorikk: () => void;
}

export function PersonIdentMedHistorikk({
  personIdent,
  harHistorikk,
  onVisHistorikk,
}: PersonIdentMedHistorikkProps) {
  return (
    <HStack gap="space-1" align="center">
      <span>{formaterFødselsnummer(personIdent)}</span>
      <CopyButton size="xsmall" copyText={personIdent} />
      {harHistorikk ? (
        <Button
          type="button"
          variant="tertiary-neutral"
          size="xsmall"
          icon={<ClockIcon aria-hidden />}
          aria-label="Vis identifikatorhistorikk"
          onClick={onVisHistorikk}
        />
      ) : (
        <Tooltip content="Denne identifikatoren har ingen historikk">
          <span>
            <Button
              type="button"
              variant="tertiary-neutral"
              size="xsmall"
              icon={<ClockIcon aria-hidden />}
              aria-label="Vis identifikatorhistorikk"
              disabled
            />
          </span>
        </Tooltip>
      )}
    </HStack>
  );
}
