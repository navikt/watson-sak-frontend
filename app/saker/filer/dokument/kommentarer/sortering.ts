import { sammenlignStier, type AnkerTreff } from "./anker";
import type { Kommentartraad } from "./typer";

/**
 * Rekkefølgen i panelet:
 *
 * 1. uløste tråder først, deretter løste,
 * 2. generelle kommentarer før forankrede,
 * 3. forankrede i dokumentrekkefølge,
 * 4. frakoblede (anker som ikke lar seg løse) sist, eldst først.
 *
 * Sorteringen er en egen, ren funksjon slik at den kan testes uten å rendre panelet.
 */
export function sorterTraader(
  traader: Kommentartraad[],
  treffPerTraad: Map<string, AnkerTreff | null>,
): Kommentartraad[] {
  function gruppe(traad: Kommentartraad): number {
    const treff = treffPerTraad.get(traad.id) ?? null;
    if (traad.ankertype === "DOCUMENT" || treff?.type === "DOCUMENT") return 0;
    if (treff) return 1;
    return 2;
  }

  return [...traader].sort((a, b) => {
    if (a.adressert !== b.adressert) return a.adressert ? 1 : -1;

    const gruppeA = gruppe(a);
    const gruppeB = gruppe(b);
    if (gruppeA !== gruppeB) return gruppeA - gruppeB;

    if (gruppeA === 1) {
      const treffA = treffPerTraad.get(a.id);
      const treffB = treffPerTraad.get(b.id);
      const stiA = treffA && treffA.type !== "DOCUMENT" ? treffA.path : [];
      const stiB = treffB && treffB.type !== "DOCUMENT" ? treffB.path : [];
      const stiSammenligning = sammenlignStier(stiA, stiB);
      if (stiSammenligning !== 0) return stiSammenligning;

      if (treffA?.type === "TEXT" && treffB?.type === "TEXT") {
        const offsetSammenligning = treffA.startOffset - treffB.startOffset;
        if (offsetSammenligning !== 0) return offsetSammenligning;
      }
    }

    return a.opprettet.localeCompare(b.opprettet);
  });
}

/** Antallet tråder som fortsatt er uløste – vises som badge på panelvalget. */
export function antallUloste(traader: Kommentartraad[]): number {
  return traader.filter((traad) => !traad.adressert).length;
}
