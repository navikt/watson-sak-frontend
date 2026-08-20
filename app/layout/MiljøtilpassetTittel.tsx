import { createContext, useContext } from "react";

const MiljøContext = createContext("prod");

type MiljøtilpassetTittelProps = {
  children: string;
};

export function MiljøProvider({ miljø, children }: { miljø: string; children: React.ReactNode }) {
  return <MiljøContext.Provider value={miljø}>{children}</MiljøContext.Provider>;
}

export function MiljøtilpassetTittel({ children }: MiljøtilpassetTittelProps) {
  const miljø = useContext(MiljøContext);
  return <title>{`${children}${miljø !== "prod" ? ` (${miljø})` : ""}`}</title>;
}
