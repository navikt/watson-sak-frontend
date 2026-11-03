/** Teksten watson-admin-api sender med 409 når en sak under flytting avsluttes (TH-118). */
export const BACKEND_SAK_UNDER_FLYTTING =
  "Du må bekrefte at saken er ferdig flyttet før du kan avslutte den.";

/** Meldingen saksbehandler ser når de prøver å avslutte en sak som ikke er ferdig flyttet. */
export const SAK_UNDER_FLYTTING_FEIL = `${BACKEND_SAK_UNDER_FLYTTING} Huk av i sjekklisten for flytting på saken.`;
