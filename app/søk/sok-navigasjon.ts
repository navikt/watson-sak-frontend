/**
 * Delte selektor-konstanter for tastaturnavigasjon mellom søkefeltet i header
 * (`AppHeader`) og søkeresultatlisten (`SøkSide`). Holdes ett sted slik at
 * begge komponentene alltid er enige om kontrakten, i stedet for at hver side
 * gjetter på den andres DOM-struktur via frittstående CSS-selektorer.
 */
export const HURTIGSØK_INPUT_SELECTOR = "[data-hurtigsøk-skjema] input";
export const SØK_RESULTATLENKE_SELECTOR = "[data-søk-resultatliste] a";
