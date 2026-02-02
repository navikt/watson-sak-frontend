import { createCookie } from "react-router";
import z from "zod";

export const themeCookie = createCookie("theme", {
  path: "/",
  maxAge: 60 * 60 * 24 * 365, // 1 year
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
});

const themeScheme = z.enum(["light", "dark"]);
export type Theme = z.infer<typeof themeScheme>;
/**
 * Parse theme value from cookie string
 */
export function parseTheme(value: string | null): Theme {
  const parset = themeScheme.safeParse(value);
  if (parset.success) {
    return parset.data;
  }
  return "light";
}
