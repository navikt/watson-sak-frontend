import { redirect } from "react-router";

/** Vi har ikke vår egen security.txt, så vi henviser til Nav sin sentrale */
export function loader() {
  return redirect("https://www.nav.no/.well-known/security.txt", {
    status: 301,
  });
}
