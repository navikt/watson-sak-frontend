import { type ActionFunctionArgs, data } from "react-router";
import { parsePreferences, preferencesCookie } from "~/preferanser/PreferencesCookie";

export async function action({ request }: ActionFunctionArgs) {
  const cookieHeader = request.headers.get("Cookie");
  const eksisterende = parsePreferences(await preferencesCookie.parse(cookieHeader));

  const formData = await request.formData();
  const oppdatering: Record<string, unknown> = {};

  for (const [key, value] of formData.entries()) {
    if (value === "true" || value === "false") {
      oppdatering[key] = value === "true";
    } else {
      oppdatering[key] = value;
    }
  }

  const oppdatert = parsePreferences({ ...eksisterende, ...oppdatering });

  return data(
    { success: true, preferences: oppdatert },
    {
      status: 200,
      headers: {
        "Set-Cookie": await preferencesCookie.serialize(oppdatert),
      },
    },
  );
}
