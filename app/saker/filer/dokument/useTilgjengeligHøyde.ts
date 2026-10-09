import { useEffect, useState } from "react";

/** Under denne bredden bruker vi vanlig sidescroll – da stables flatene under hverandre. */
const MINSTE_BREDDE_FOR_EGEN_SCROLL = 1024;

/**
 * Måler hvor høy editorflaten kan være for at siden akkurat fyller vinduet, uten å
 * scrolle. Vi måler plassen over og under flaten – begge er uavhengige av flatens egen
 * høyde, så målingen gir samme svar hver gang og kan trygt kjøres på nytt.
 */
export function useTilgjengeligHøyde(ref: React.RefObject<HTMLDivElement | null>) {
  const [høyde, settHøyde] = useState<number>();

  useEffect(() => {
    function mål() {
      const el = ref.current;
      if (!el || window.innerWidth < MINSTE_BREDDE_FOR_EGEN_SCROLL) {
        settHøyde(undefined);
        return;
      }

      const boks = el.getBoundingClientRect();
      const over = boks.top + window.scrollY;
      const under = document.documentElement.scrollHeight - (boks.bottom + window.scrollY);
      settHøyde(Math.max(320, window.innerHeight - over - under));
    }

    mål();
    window.addEventListener("resize", mål);
    return () => window.removeEventListener("resize", mål);
  }, [ref]);

  return høyde;
}
