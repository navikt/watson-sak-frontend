import { InformationSquareIcon } from "@navikt/aksel-icons";
import { InfoCard } from "@navikt/ds-react";

const tidspunktformat = new Intl.DateTimeFormat("nb-NO", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Oslo",
});

/** Formaterer fristen som «3. desember 2026 kl. 10:00» i norsk tid. */
export function formaterFrist(iso: string): string {
  const deler = tidspunktformat.formatToParts(new Date(iso));
  const del = (type: Intl.DateTimeFormatPartTypes) =>
    deler.find((d) => d.type === type)?.value ?? "";
  return `${del("day")}. ${del("month")} ${del("year")} kl. ${del("hour")}:${del("minute")}`;
}

/** Om banneret skal vises: fristen finnes og er ikke passert. Backend håndhever fristen uansett. */
export function erInnenforLesevinduet(filerTilgjengeligTil: string | null | undefined, nå: Date) {
  return Boolean(filerTilgjengeligTil) && nå < new Date(filerTilgjengeligTil as string);
}

type Props = {
  filerTilgjengeligTil: string | null | undefined;
  nå?: Date;
};

/**
 * Forteller ansvarlig og delt med på en avsluttet sak hvor lenge de kan se dokumenter og filer
 * som ikke er journalført (TH-101). Vises ikke etter fristen.
 */
export function FilerTilgjengeligVarsel({ filerTilgjengeligTil, nå = new Date() }: Props) {
  if (!filerTilgjengeligTil || !erInnenforLesevinduet(filerTilgjengeligTil, nå)) return null;

  return (
    <InfoCard data-color="info">
      <InfoCard.Header icon={<InformationSquareIcon aria-hidden />}>
        <InfoCard.Title as="h2">Saken er avsluttet</InfoCard.Title>
      </InfoCard.Header>
      <InfoCard.Content>
        Du kan lese dokumenter og filer som ikke er journalført, fram til{" "}
        {formaterFrist(filerTilgjengeligTil)}. Du kan ikke endre eller kommentere dem.
      </InfoCard.Content>
    </InfoCard>
  );
}
