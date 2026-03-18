import { layout, route, type RouteConfig as RouteConfigType } from "@react-router/dev/routes";
import { RouteConfig } from "./routeConfig";

export default [
  // App routes
  layout("layout/AppLayout.tsx", [
    route(RouteConfig.INDEX, "landingsside/LandingSide.route.tsx"),
    route(RouteConfig.FORDELING, "fordeling/FordelingSide.route.tsx"),
    route(RouteConfig.SAKER_DETALJ, "saker/SakDetaljSide.route.tsx"),
    route(RouteConfig.VIDERESEND_SAK, "saker/videresending/VideresendSakSide.route.tsx"),
    route(RouteConfig.POLITIANMELDELSE, "saker/politianmeldelse/PolitianmeldelseSide.route.tsx"),
    route(RouteConfig.MINE_SAKER, "mine-saker/MineSakerSide.route.tsx"),
    route(RouteConfig.REGISTRER_SAK, "registrer-sak/RegistrerSakSide.route.tsx"),
    route(RouteConfig.STATISTIKK, "statistikk/StatistikkSide.route.tsx"),
    route(RouteConfig.PERSONVERN, "personvern/PersonvernSide.route.tsx"),
  ]),

  // API routes
  route(RouteConfig.API.HEALTH, "monitorering/helsesjekk/api.ts"),
  route(RouteConfig.API.LOGGED_IN_USER, "admin/innlogget-bruker/api.ts"),
  route(RouteConfig.API.THEME, "tema/api.ts"),
  route(RouteConfig.API.PREFERENCES, "preferanser/api.ts"),
  route(RouteConfig.API.VERSION, "versjonsvarsling/api.ts"),
  route(RouteConfig.API.RESET_MOCK_DATA, "testing/reset-api.ts"),

  // Well-known routes
  route(RouteConfig.WELL_KNOWN.SECURITY_TXT, "sikkerhet/well-known/api.ts"),

  // Fallback 404 route
  route("*", "feilhåndtering/404.route.tsx"),
] satisfies RouteConfigType;
