import { z } from "zod";
import { logger } from "~/logging/logging";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .describe("The mode the app is running in"),
  ENVIRONMENT: z
    .enum(["local-backend", "local-dev", "local-mock", "demo", "dev", "prod"])
    .describe("The environment the app is running in"),
  CLUSTER: z.string().describe("The cluster the app is running in"),
  FARO_URL: z.string().describe("The URL of the Faro instance"),
  UMAMI_SITE_ID: z.string().describe("The ID of the Umami instance"),
  IDENT_SESSION_SECRET: z.string().describe("The secret for the ident session"),

  DEVELOPMENT_OAUTH_TOKEN: z
    .string()
    .optional()
    .describe("The OAuth token for the development environment. Is not set in production."),
  UNLEASH_SERVER_API_ENV: z
    .enum(["development", "production"])
    .describe("The environment of the Unleash instance")
    .default("development"),
  UNLEASH_SERVER_API_TYPE: z
    .string()
    .describe("What kind of client is being used?")
    .default("CLIENT"),
  UNLEASH_SERVER_API_TOKEN: z
    .string()
    .describe("Unique API token for the Unleash client")
    .optional(),
  UNLEASH_SERVER_API_PROJECTS: z.string().describe("The Unleash project to use").default("default"),
  UNLEASH_SERVER_API_URL: z
    .string()
    .describe("The URL of the Unleash instance")
    .default("https://holmes-unleash-api.nav.cloud.nais.io"),
  APP_VERSION: z.string().describe("The version of the app").default("ukjent"),
});

const envResult = envSchema.safeParse(process.env);

if (!envResult.success) {
  logger.error("Mangler eller er ugyldige miljøvariabler", {
    error: envResult.error,
  });
  throw new Error("Invalid environment variables. Check console for more information.");
}

export const env = envResult.data;

export const BACKEND_API_URL =
  env.ENVIRONMENT === "local-backend"
    ? "http://localhost:8080"
    : env.ENVIRONMENT === "local-dev"
      ? "http://TODO"
      : "http://TODO";

export const isProd = env.NODE_ENV === "production";
export const isDev = env.NODE_ENV === "development";

export const skalBrukeMockdata = env.ENVIRONMENT === "local-mock" || env.ENVIRONMENT === "demo";
