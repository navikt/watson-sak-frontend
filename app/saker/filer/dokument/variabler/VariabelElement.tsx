import { TagIcon } from "@navikt/aksel-icons";
import { createContext, useContext } from "react";
import type { TElement } from "platejs";
import { PlateElement } from "platejs/react";
import type { PlateElementProps } from "platejs/react";
import { finnVariabel, type VariabelId, type VariabelVerdier } from "./variabel-typer";

export type VariabelElementType = TElement & {
  variabelId: VariabelId;
};

const VariabelVerdierContext = createContext<VariabelVerdier>({});

export function VariabelVerdierProvider({
  verdier,
  children,
}: {
  verdier: VariabelVerdier;
  children: React.ReactNode;
}) {
  return (
    <VariabelVerdierContext.Provider value={verdier}>{children}</VariabelVerdierContext.Provider>
  );
}

function formaterDagensDato() {
  return new Intl.DateTimeFormat("nb-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());
}

function hentVerdi(variabelId: VariabelId, verdier: VariabelVerdier) {
  if (variabelId === "dagens-dato") return formaterDagensDato();
  return verdier[variabelId];
}

/** Rendrer en levende, ikke-redigerbar inline-variabel i dokumentteksten. */
export function VariabelElement(props: PlateElementProps<VariabelElementType>) {
  const definisjon = finnVariabel(props.element.variabelId);
  const verdi = hentVerdi(props.element.variabelId, useContext(VariabelVerdierContext));
  const tekst = verdi || `[${definisjon?.etikett ?? "Ukjent variabel"} mangler]`;
  const manglerVerdi = !verdi;

  return (
    <PlateElement as="span" {...props} className="inline">
      <span
        contentEditable={false}
        className={
          "mx-0.5 inline-flex items-center gap-1 rounded border px-1.5 py-0.5 align-baseline text-sm font-semibold " +
          (manglerVerdi
            ? "border-ax-border-warning bg-ax-bg-warning-soft text-ax-text-warning"
            : "border-[#c0d6e4] bg-[#eaf2fa] text-ax-text-accent-subtle")
        }
      >
        <TagIcon aria-hidden fontSize="1rem" />
        {tekst}
      </span>
      {props.children}
    </PlateElement>
  );
}
