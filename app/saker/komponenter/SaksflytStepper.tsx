import { CheckmarkIcon } from "@navikt/aksel-icons";
import { Detail } from "@navikt/ds-react";
import type { KontrollsakSteg } from "../types.backend";

type Stegtilstand = "fullført" | "aktiv" | "kommende";

const saksflytSteg: { etikett: string; steg: KontrollsakSteg[] }[] = [
  { etikett: "Opprettet", steg: ["OPPRETTET"] },
  { etikett: "Utredning", steg: ["UTREDNING", "UTREDES"] },
  { etikett: "Forvaltning", steg: ["FORVALTNING"] },
  { etikett: "Strafferettslig vurdering", steg: ["STRAFFERETTSLIG_VURDERING"] },
  { etikett: "Politiet", steg: ["POLITI", "ANMELDT"] },
  { etikett: "Avsluttet", steg: ["AVSLUTTET"] },
];

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

function finnTilstand(indeks: number, aktivIndeks: number, erAvsluttet: boolean): Stegtilstand {
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
};

export function SaksflytStepper({ steg }: SaksflytStepperProps) {
  const aktivIndeks = saksflytSteg.findIndex((flytSteg) => flytSteg.steg.includes(steg));
  const erAvsluttet = steg === "AVSLUTTET";

  return (
    <ol aria-label="Saksflyt" className="m-0 flex list-none p-0">
      {saksflytSteg.map((flytSteg, indeks) => {
        const tilstand = finnTilstand(indeks, aktivIndeks, erAvsluttet);

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
                className={`absolute top-3 right-[calc(50%+14px)] left-[calc(-50%+14px)] -translate-y-1/2 ${linjeFarge[tilstand]}`}
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
