import { type ActionFunctionArgs, data } from "react-router";
import { parseTheme, themeCookie } from "~/tema/ThemeCookie";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const theme = formData.get("theme")?.toString();

  if (!theme) {
    return data({ error: "Tema er påkrevd" }, { status: 400 });
  }

  const parsedTheme = parseTheme(theme);

  // Create response with the cookie set
  return data(
    { success: true, theme: parsedTheme },
    {
      status: 200,
      headers: {
        "Set-Cookie": await themeCookie.serialize(parsedTheme),
      },
    },
  );
}
