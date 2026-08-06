import { Link } from "@navikt/ds-react";
import { Fragment } from "react";
import { Link as RouterLink } from "react-router";

type Brødsmule = {
  /** Teksten som vises i stien. */
  etikett: string;
  /** Utelates for steg som ikke skal lenke noe sted (f.eks. rene grupperinger). */
  til?: string;
};

type BrødsmulestiProps = {
  /** Stegene i stien. Det siste steget regnes som gjeldende side og lenker aldri. */
  smuler: Brødsmule[];
  className?: string;
};

/**
 * Brødsmulesti som viser hvor brukeren befinner seg i hierarkiet.
 *
 * Aksel har ingen egen brødsmule-komponent, så vi følger anbefalt oppskrift:
 * en `nav` med `ol`/`li` og skilletegn som er skjult for skjermlesere.
 */
export function Brødsmulesti({ smuler, className }: BrødsmulestiProps) {
  return (
    <nav aria-label="Du er her" className={className}>
      <ol className="flex flex-wrap items-center gap-x-1 text-ax-small text-ax-text-neutral-subtle">
        {smuler.map((smule, indeks) => {
          const erSiste = indeks === smuler.length - 1;

          return (
            <Fragment key={`${smule.etikett}-${indeks}`}>
              {indeks > 0 && (
                <li aria-hidden className="select-none">
                  /
                </li>
              )}
              <li aria-current={erSiste ? "page" : undefined}>
                {smule.til && !erSiste ? (
                  <Link as={RouterLink} to={smule.til} className="text-inherit">
                    {smule.etikett}
                  </Link>
                ) : (
                  smule.etikett
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
