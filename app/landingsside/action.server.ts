import { data } from "react-router";
import type { Route } from "./+types/LandingSide.route";

export async function action(_: Route.ActionArgs) {
  throw data("POST støttes ikke på denne ruten", { status: 405 });
}
