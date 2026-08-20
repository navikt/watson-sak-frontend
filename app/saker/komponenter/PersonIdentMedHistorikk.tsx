import { ClockIcon } from "@navikt/aksel-icons";
import { BodyShort, Button, CopyButton, HStack, Tooltip } from "@navikt/ds-react";
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
      <BodyShort size="small" as="span">
        {formaterFødselsnummer(personIdent)}
      </BodyShort>
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
          <span
            className="inline-flex items-center"
            tabIndex={0}
            aria-label="Denne identifikatoren har ingen historikk"
          >
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
