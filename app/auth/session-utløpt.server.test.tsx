import { render, screen, waitFor } from "@testing-library/react";
import {
  createMemoryRouter,
  isRouteErrorResponse,
  RouterProvider,
  useRouteError,
} from "react-router";
import { describe, expect, it } from "vitest";
import { kastHvisUtlogget } from "./session-utløpt.server";

/**
 * `data()` returnerer bare en beskrivelse av en route-feilrespons — den blir
 * først en ekte `ErrorResponse` (som `isRouteErrorResponse` kjenner igjen)
 * når React Router fanger den kastede verdien fra en loader. Derfor testes
 * `kastHvisUtlogget` her via en ekte router i stedet for å kalle funksjonen
 * direkte og inspisere det den kaster.
 */
function TestFeilside() {
  const error = useRouteError();
  return <div>Feilstatus: {isRouteErrorResponse(error) ? error.status : "ukjent"}</div>;
}

function renderMedLoader(responsStatus: number) {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        loader: () => {
          kastHvisUtlogget(new Response(null, { status: responsStatus }));
          return { ok: true };
        },
        Component: () => <div>Innhold</div>,
        ErrorBoundary: TestFeilside,
        HydrateFallback: () => null,
      },
    ],
    { initialEntries: ["/"] },
  );

  return render(<RouterProvider router={router} />);
}

describe("kastHvisUtlogget", () => {
  it("kaster en route-feilrespons med status 401 når backend svarer 401", async () => {
    renderMedLoader(401);

    await waitFor(() => expect(screen.getByText("Feilstatus: 401")).toBeDefined());
  });

  it("gjør ingenting når responsen ikke er 401, slik at siden lastes normalt", async () => {
    renderMedLoader(403);

    await waitFor(() => expect(screen.getByText("Innhold")).toBeDefined());
  });
});
