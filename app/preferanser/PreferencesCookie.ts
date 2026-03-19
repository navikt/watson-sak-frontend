import { createCookie } from "react-router";
import z from "zod";

export const preferencesCookie = createCookie("preferences", {
  path: "/",
  maxAge: 60 * 60 * 24 * 365, // 1 år
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
});

const preferencesSchema = z.object({
  sidebarKollapset: z.boolean().default(false),
  tema: z.enum(["light", "dark", "system"]).default("system"),
  visVelkomstmelding: z.boolean().default(true),
});

export type Preferences = z.infer<typeof preferencesSchema>;

export const defaultPreferences: Preferences = {
  sidebarKollapset: false,
  tema: "system",
  visVelkomstmelding: true,
};

export function parsePreferences(value: unknown): Preferences {
  const parset = preferencesSchema.safeParse(value);
  if (parset.success) {
    return parset.data;
  }
  return defaultPreferences;
}
