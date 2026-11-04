import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it } from "vitest";
import { MigreringSjekkliste } from "./MigreringSjekkliste";

describe("MigreringSjekkliste", () => {
  it("viser kontekstuell feilmelding når ferdigmerking feiler teknisk", async () => {
    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: <MigreringSjekkliste kanLagres={true} />,
          action: () => ({ ok: false, feil: "Intern feil", feilId: "ERR-789", teknisk: true }),
        },
      ],
      { initialEntries: ["/"] },
    );
    render(<RouterProvider router={router} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Lastet opp alle filer fra S:" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Overført all informasjon fra Access" }));
    fireEvent.click(screen.getByRole("button", { name: "Marker saken som ferdig flyttet" }));

    expect(await screen.findByText("Vi fikk ikke merket saken som ferdig flyttet")).toBeDefined();
    expect(screen.getByText("Prøv igjen om litt.")).toBeDefined();
    expect(screen.getByText("ERR-789")).toBeDefined();
    expect(
      (screen.getByRole("checkbox", { name: "Lastet opp alle filer fra S:" }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect(
      (
        screen.getByRole("checkbox", {
          name: "Overført all informasjon fra Access",
        }) as HTMLInputElement
      ).checked,
    ).toBe(true);
    await waitFor(() => expect(router.state.navigation.state).toBe("idle"));
  });
});
