import { data } from "react-router";
import type { Route } from "./+types/LandingSide.route";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const handling = formData.get("handling");

  throw data(`Ukjent handling: ${handling}`, { status: 400 });
}
