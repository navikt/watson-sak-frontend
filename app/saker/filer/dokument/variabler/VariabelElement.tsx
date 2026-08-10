import { TagIcon } from "@navikt/aksel-icons";
import { Tooltip } from "@navikt/ds-react";
import { createContext, useContext } from "react";
import type { TElement } from "platejs";
import { PlateElement } from "platejs/react";
import type { PlateElementProps } from "platejs/react";
import { finnVariabel, type VariabelId, type VariabelVerdier } from "./variabel-typer";

export type VariabelElementType = TElement & {
  variabelId: VariabelId;
};

type VariabelKontekst = {
  verdier: VariabelVerdier;
  erVariabelpanelÅpent: boolean;
};

const VariabelVerdierContext = createContext<VariabelKontekst>({
  verdier: {},
  erVariabelpanelÅpent: false,
});

export function VariabelVerdierProvider({
  verdier,
  erVariabelpanelÅpent,
  children,
}: {
  verdier: VariabelVerdier;
  erVariabelpanelÅpent: boolean;
  children: React.ReactNode;
}) {
  return (
    <VariabelVerdierContext.Provider value={{ verdier, erVariabelpanelÅpent }}>
      {children}
    </VariabelVerdierContext.Provider>
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
  const { verdier, erVariabelpanelÅpent } = useContext(VariabelVerdierContext);
  const verdi = hentVerdi(props.element.variabelId, verdier);
  const tekst = verdi || `[${definisjon?.etikett ?? "Ukjent variabel"} mangler]`;
  const manglerVerdi = !verdi;

  return (
    <PlateElement as="span" {...props} className="inline">
      <Tooltip content={definisjon?.etikett ?? "Ukjent variabel"}>
        <span
          contentEditable={false}
          className={
            "mx-0.5 inline-flex items-center gap-1 rounded border px-1.5 py-0.5 align-baseline text-sm font-semibold transition-colors " +
            (manglerVerdi
              ? "border-ax-border-warning bg-ax-bg-warning-soft text-ax-text-warning"
              : erVariabelpanelÅpent
                ? "border-[#c0d6e4] bg-[#d8e8f3] text-ax-text-accent-subtle"
                : "border-[#c0d6e4] bg-[#eaf2fa] text-ax-text-accent-subtle")
          }
        >
          <TagIcon aria-hidden fontSize="1rem" />
          {tekst}
        </span>
      </Tooltip>
      {props.children}
    </PlateElement>
  );
}
