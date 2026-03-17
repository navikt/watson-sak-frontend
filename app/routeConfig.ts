/**
 * This file contains all the routes for the app. It should be used whenever you
 * want to link to a route, or specify it in the routes.ts file
 */
export const RouteConfig = {
  INDEX: "/",
  FORDELING: "/fordeling",
  SAKER_DETALJ: "/saker/:sakId",
  VIDERESEND_SAK: "/saker/:sakId/videresend",
  POLITIANMELDELSE: "/saker/:sakId/politianmeldelse",
  MINE_SAKER: "/mine-saker",
  REGISTRER_SAK: "/registrer-sak",
  STATISTIKK: "/statistikk",
  PERSONVERN: "/personvern",

  WELL_KNOWN: {
    SECURITY_TXT: "/.well-known/security.txt",
  },

  API: {
    HEALTH: "/api/health",
    LOGGED_IN_USER: "/api/logged-in-user",
    THEME: "/api/theme",
    VERSION: "/api/version",
    RESET_MOCK_DATA: "/api/reset-mock-data",
  },
};
