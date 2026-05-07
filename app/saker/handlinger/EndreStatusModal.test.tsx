import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { EndreStatusModal } from "./EndreStatusModal";

const submitMock = vi.fn();

vi.mock("react-router", async () => {
  const actual = await vi.importActual<typeof import("react-router")>("react-router");

  return {
    ...actual,
    useFetcher: () => ({
      state: "idle",
      submit: submitMock,
      data: undefined,
      Form: "form",
    }),
  };
});

function renderMedRouter(ui: React.ReactNode) {
  const router = createMemoryRouter([{ path: "/", element: ui }], {
    initialEntries: ["/"],
  });

  return render(<RouterProvider router={router} />);
}

describe("EndreStatusModal", () => {
  it("deaktiverer gjeldende status i listen", async () => {
    renderMedRouter(
      <EndreStatusModal
        sakId="00000000-0000-4000-8000-000000000001"
        nåværendeStatus="UTREDES"
        åpen={true}
        onClose={() => {}}
      />,
    );

    const select = screen.getByLabelText("Ny status");
    const utredesOption = screen.getByRole("option", { name: "Utredes" });

    expect((utredesOption as HTMLOptionElement).disabled).toBe(true);

    fireEvent.change(select, { target: { value: "UTREDES" } });

    expect(submitMock).not.toHaveBeenCalled();
  });
});
