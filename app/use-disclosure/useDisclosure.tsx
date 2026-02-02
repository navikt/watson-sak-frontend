import { useCallback, useState } from "react";

/**
 * Hook for å håndtere åpning og lukking av en komponent, en modal eller hva som helst
 *
 * @param initialState Om staten initielt skal være åpen eller lukket
 * @returns Objekt med state og funksjoner for å åpne, lukke og toggle staten
 */
export function useDisclosure(initialState = false) {
  const [erÅpen, setErÅpen] = useState(initialState);
  return {
    erÅpen: erÅpen,
    erLukket: !erÅpen,
    onÅpne: useCallback(() => setErÅpen(true), []),
    onLukk: useCallback(() => setErÅpen(false), []),
    onToggle: useCallback(() => setErÅpen((prev) => !prev), []),
  };
}
