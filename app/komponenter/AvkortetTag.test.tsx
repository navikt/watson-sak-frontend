import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AvkortetTag } from "./AvkortetTag";

function settBredder(scrollWidth: number, clientWidth: number) {
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(scrollWidth);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(clientWidth);
}

describe("AvkortetTag", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("viser hele teksten i et tooltip når teksten er avkortet", async () => {
    settBredder(300, 100);
    render(<AvkortetTag variant="outline">Strafferettslig vurdering</AvkortetTag>);

    fireEvent.focusIn(screen.getByText("Strafferettslig vurdering").closest("span.aksel-tag")!);

    await waitFor(() => {
      expect(screen.getByRole("tooltip").textContent).toBe("Strafferettslig vurdering");
    });
  });

  it("viser ikke tooltip når teksten får plass", async () => {
    settBredder(100, 100);
    render(<AvkortetTag variant="outline">Aktiv</AvkortetTag>);

    fireEvent.focusIn(screen.getByText("Aktiv").closest("span.aksel-tag")!);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
