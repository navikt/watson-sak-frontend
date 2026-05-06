/**
 * This file contains all the routes for the app. It should be used whenever you
 * want to link to a route, or specify it in the routes.ts file
 */
export const RouteConfig = {
  INDEX: "/",
  FORDELING: "/fordeling",
  SAKER_DETALJ: "/saker/:sakId",
  MINE_SAKER: "/mine-saker",
  ALLE_SAKER: "/alle-saker",
  REGISTRER_SAK: "/registrer-sak",
  STATISTIKK: "/statistikk",
  PERSONVERN: "/personvern",
  SØK: "/søk",

  WELL_KNOWN: {
    SECURITY_TXT: "/.well-known/security.txt",
  },

  API: {
    HEALTH: "/api/health",
    LOGGED_IN_USER: "/api/logged-in-user",
    VERSION: "/api/version",
    PREFERENCES: "/api/preferences",
    RESET_MOCK_DATA: "/api/reset-mock-data",
    PERSON_OPPSLAG: "/api/registrer-sak/person-oppslag",
  },
};
