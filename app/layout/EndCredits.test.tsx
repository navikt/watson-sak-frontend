import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { EndCredits } from "./EndCredits";

// jsdom mangler showModal()/close() på <dialog>.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
  };
});

describe("EndCredits", () => {
  it("åpnes som modal dialog med teamet", () => {
    render(<EndCredits onLukk={vi.fn()} />);

    const dialog = screen.getByRole<HTMLDialogElement>("dialog", { name: "Rulletekst" });
    expect(dialog.open).toBe(true);
    expect(screen.getByText("Kristofer Giltvedt Selbekk")).toBeTruthy();
  });

  it("lukkes når brukeren trykker Escape", () => {
    const onLukk = vi.fn();
    render(<EndCredits onLukk={onLukk} />);

    const dialog = screen.getByRole("dialog");
    const cancel = createEvent("cancel", dialog, { cancelable: true });
    fireEvent(dialog, cancel);

    expect(cancel.defaultPrevented).toBe(true);
    expect(onLukk).toHaveBeenCalledOnce();
  });

  it("lukkes når brukeren klikker", () => {
    const onLukk = vi.fn();
    render(<EndCredits onLukk={onLukk} />);

    fireEvent.click(screen.getByRole("dialog"));

    expect(onLukk).toHaveBeenCalledOnce();
  });

  it("lukkes når teksten har rullet ferdig", () => {
    const onLukk = vi.fn();
    render(<EndCredits onLukk={onLukk} />);

    const rull = screen.getByText("Slutt").parentElement as HTMLElement;
    // jsdom mangler AnimationEvent, så React lytter på det prefiksede navnet.
    fireEvent(rull, new Event("webkitAnimationEnd", { bubbles: true }));

    expect(onLukk).toHaveBeenCalledOnce();
  });

  it("gir fokus tilbake til forrige element når den lukkes", () => {
    const knapp = document.createElement("button");
    document.body.appendChild(knapp);
    knapp.focus();

    const { unmount } = render(<EndCredits onLukk={vi.fn()} />);
    unmount();

    expect(document.activeElement).toBe(knapp);
    knapp.remove();
  });
});
