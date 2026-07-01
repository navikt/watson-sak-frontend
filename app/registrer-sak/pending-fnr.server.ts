import { createCookie } from "react-router";
import { env } from "~/config/env.server";

export const pendingFnrCookie = createCookie("pending-fnr", {
  path: "/registrer-sak",
  maxAge: 60, // engangskode, utløper etter 1 minutt
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
  secrets: [env.IDENT_SESSION_SECRET],
});
