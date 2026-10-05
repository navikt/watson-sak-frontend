import { CheckmarkIcon } from "@navikt/aksel-icons";
import { Detail } from "@navikt/ds-react";
import type { KontrollsakResponse, KontrollsakSteg } from "../types.backend";

type Stegtilstand = "fullført" | "aktiv" | "kommende";

const saksflytSteg: { etikett: string; steg: KontrollsakSteg[] }[] = [
  { etikett: "Opprettet", steg: ["OPPRETTET"] },
  { etikett: "Utredning", steg: ["UTREDNING", "UTREDES"] },
  { etikett: "Forvaltning", steg: ["FORVALTNING"] },
  { etikett: "Strafferettslig vurdering", steg: ["STRAFFERETTSLIG_VURDERING"] },
  { etikett: "Politiet", steg: ["POLITI", "ANMELDT"] },
  { etikett: "Avsluttet", steg: ["AVSLUTTET"] },
];

const avsluttetIndeks = saksflytSteg.findIndex((flytSteg) => flytSteg.steg.includes("AVSLUTTET"));

function finnAvslutningssteg(
  resultat: KontrollsakResponse["resultat"],
): KontrollsakSteg | undefined {
  if (resultat?.politi) {
    return resultat.politi.type === "HENLAGT" ? "POLITI" : undefined;
  }
  if (resultat?.strafferettsligVurdering) {
    return resultat.strafferettsligVurdering.type === "HENLAGT"
      ? "STRAFFERETTSLIG_VURDERING"
      : undefined;
  }
  if (resultat?.forvaltning) {
    const endeligUtfall =
      resultat.forvaltning.endeligUtfall === undefined
        ? resultat.endeligUtfall
        : resultat.forvaltning.endeligUtfall;
    return resultat.forvaltning.type === "SAKEN_SKAL_IKKE_VURDERES_FOR_ANMELDELSE" && endeligUtfall
      ? "FORVALTNING"
      : undefined;
  }
  return resultat?.utredning?.type === "HENLAGT" ? "UTREDNING" : undefined;
}

const skjermleserTekst: Record<Stegtilstand, string> = {
  fullført: "fullført",
  aktiv: "gjeldende steg",
  kommende: "ikke startet",
};

const linjeFarge: Record<Stegtilstand, string> = {
  fullført: "bg-ax-bg-success-strong h-0.5",
  aktiv: "bg-ax-text-accent h-0.5",
  kommende: "bg-ax-border-neutral-subtle h-px",
};

function finnTilstand(
  indeks: number,
  aktivIndeks: number,
  erAvsluttet: boolean,
  sisteFullførteIndeks: number,
): Stegtilstand {
  if (erAvsluttet && sisteFullførteIndeks >= 0) {
    if (indeks <= sisteFullførteIndeks) return "fullført";
    if (indeks === avsluttetIndeks) return "aktiv";
    return "kommende";
  }
  if (indeks < aktivIndeks || (erAvsluttet && indeks === aktivIndeks)) return "fullført";
  if (indeks === aktivIndeks) return "aktiv";
  return "kommende";
}

function Stegsirkel({ tilstand }: { tilstand: Stegtilstand }) {
  if (tilstand === "fullført") {
    return (
      <span className="flex size-6 items-center justify-center rounded-full bg-ax-bg-success-strong text-ax-text-success-contrast">
        <CheckmarkIcon aria-hidden fontSize="1.125rem" />
      </span>
    );
  }
  if (tilstand === "aktiv") {
    return (
      <span className="flex size-6 items-center justify-center rounded-full border-[2.5px] border-ax-text-accent bg-ax-bg-default">
        <span className="size-2 rounded-full bg-ax-text-accent" />
      </span>
    );
  }
  return (
    <span className="size-6 rounded-full border-[1.5px] border-ax-border-neutral-subtle bg-ax-bg-default" />
  );
}

type SaksflytStepperProps = {
  steg: KontrollsakSteg;
  resultat?: KontrollsakResponse["resultat"];
};

export function SaksflytStepper({ steg, resultat }: SaksflytStepperProps) {
  const aktivIndeks = saksflytSteg.findIndex((flytSteg) => flytSteg.steg.includes(steg));
  const erAvsluttet = steg === "AVSLUTTET";
  const avslutningssteg = finnAvslutningssteg(resultat);
  const sisteFullførteIndeks = saksflytSteg.findIndex((flytSteg) =>
    flytSteg.steg.some((steg) => steg === avslutningssteg),
  );

  return (
    <ol aria-label="Saksflyt" className="m-0 flex list-none p-0">
      {saksflytSteg.map((flytSteg, indeks) => {
        const tilstand = finnTilstand(indeks, aktivIndeks, erAvsluttet, sisteFullførteIndeks);
        const linjeTilstand =
          erAvsluttet && sisteFullførteIndeks >= 0 && indeks === avsluttetIndeks
            ? "kommende"
            : tilstand;

        return (
          <li
            key={flytSteg.etikett}
            data-tilstand={tilstand}
            aria-current={tilstand === "aktiv" ? "step" : undefined}
            className="relative flex min-w-0 flex-1 flex-col items-center gap-1 text-center hyphens-auto break-words"
          >
            {indeks > 0 && (
              <span
                aria-hidden
                className={`absolute top-3 right-[calc(50%+14px)] left-[calc(-50%+14px)] -translate-y-1/2 ${linjeFarge[linjeTilstand]}`}
              />
            )}
            <Stegsirkel tilstand={tilstand} />
            <Detail
              as="span"
              weight={tilstand === "kommende" ? "regular" : "semibold"}
              className={
                tilstand === "aktiv"
                  ? "font-bold text-ax-text-accent"
                  : tilstand === "fullført"
                    ? "text-ax-text-neutral"
                    : "text-ax-text-neutral-subtle"
              }
            >
              {flytSteg.etikett}
              <span className="sr-only">, {skjermleserTekst[tilstand]}</span>
            </Detail>
          </li>
        );
      })}
    </ol>
  );
}
