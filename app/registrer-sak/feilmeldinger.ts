/**
 * Delt feilmelding for manglende tilgang til å opprette sak på en person.
 *
 * Brukes både når personoppslaget avvises (person-oppslag.api.ts) og som
 * forsvar-i-dybden dersom selve sak-opprettelsen skulle avvises av samme
 * grunn (RegistrerSakSide.server.ts). Samlet ett sted for å unngå at teksten
 * driver fra hverandre over tid.
 */
export const INGEN_TILGANG_TIL_Å_OPPRETTE_SAK_MELDING =
  "Du har ikke tilgang til å opprette sak på denne personen";
