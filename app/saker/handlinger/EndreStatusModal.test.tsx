import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  beforeEach(() => {
    submitMock.mockClear();
  });
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

  it("viser henleggelsesårsak når HENLAGT velges", () => {
    renderMedRouter(
      <EndreStatusModal
        sakId="00000000-0000-4000-8000-000000000001"
        nåværendeStatus="UTREDES"
        åpen={true}
        onClose={() => {}}
      />,
    );

    expect(screen.queryByLabelText("Henleggelsesårsak")).toBeNull();

    const statusSelect = screen.getByLabelText("Ny status");
    fireEvent.change(statusSelect, { target: { value: "HENLAGT" } });

    expect(screen.getByLabelText("Henleggelsesårsak")).toBeDefined();
    expect(screen.getByRole("option", { name: "Ikke kapasitet" })).toBeDefined();
    expect(screen.getByRole("option", { name: "Ikke tilstrekkelig bevisgrunnlag" })).toBeDefined();
    expect(screen.getByRole("option", { name: "Foreldet" })).toBeDefined();
  });

  it("skjuler henleggelsesårsak når annen status velges", () => {
    renderMedRouter(
      <EndreStatusModal
        sakId="00000000-0000-4000-8000-000000000001"
        nåværendeStatus="UTREDES"
        åpen={true}
        onClose={() => {}}
      />,
    );

    const statusSelect = screen.getByLabelText("Ny status");
    fireEvent.change(statusSelect, { target: { value: "HENLAGT" } });
    expect(screen.getByLabelText("Henleggelsesårsak")).toBeDefined();

    fireEvent.change(statusSelect, { target: { value: "ANMELDT" } });
    expect(screen.queryByLabelText("Henleggelsesårsak")).toBeNull();
  });

  it("lar brukeren velge henleggelsesårsak og sende inn skjema med riktig data", () => {
    renderMedRouter(
      <EndreStatusModal
        sakId="00000000-0000-4000-8000-000000000001"
        nåværendeStatus="UTREDES"
        åpen={true}
        onClose={() => {}}
      />,
    );

    const statusSelect = screen.getByLabelText("Ny status");
    fireEvent.change(statusSelect, { target: { value: "HENLAGT" } });

    const arsakSelect = screen.getByLabelText("Henleggelsesårsak");
    fireEvent.change(arsakSelect, { target: { value: "IKKE_KAPASITET" } });

    expect((arsakSelect as HTMLSelectElement).value).toBe("IKKE_KAPASITET");

    const lagreKnapp = screen.getByRole("button", { name: "Lagre" });
    fireEvent.click(lagreKnapp);

    expect(submitMock).toHaveBeenCalledOnce();
    const formData = submitMock.mock.calls[0][0] as FormData;
    expect(formData.get("status")).toBe("HENLAGT");
    expect(formData.get("henleggelsesarsak")).toBe("IKKE_KAPASITET");
    expect(formData.get("handling")).toBe("endre_status");
  });
});
