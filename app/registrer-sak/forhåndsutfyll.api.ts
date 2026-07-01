import { redirect } from "react-router";
import { RouteConfig } from "~/routeConfig";
import { erFnr } from "~/utils/string-utils";
import { pendingFnrCookie } from "./pending-fnr.server";

export async function action({ request }: { request: Request }) {
  const formData = await request.formData();
  const fnr = (formData.get("fnr")?.toString() ?? "").replace(/\s/g, "");

  if (!erFnr(fnr)) {
    return redirect(RouteConfig.REGISTRER_SAK);
  }

  return redirect(RouteConfig.REGISTRER_SAK, {
    headers: { "Set-Cookie": await pendingFnrCookie.serialize(fnr) },
  });
}
