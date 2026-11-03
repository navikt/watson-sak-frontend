import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  erInnenforLesevinduet,
  FilerTilgjengeligVarsel,
  formaterFrist,
} from "./FilerTilgjengeligVarsel";

const frist = "2026-12-03T09:00:00Z";

describe("FilerTilgjengeligVarsel", () => {
  it("formaterer fristen i norsk tid", () => {
    expect(formaterFrist(frist)).toBe("3. desember 2026 kl. 10:00");
  });

  it("er innenfor lesevinduet til fristen, men ikke på eller etter den", () => {
    expect(erInnenforLesevinduet(frist, new Date("2026-12-03T08:59:59.999Z"))).toBe(true);
    expect(erInnenforLesevinduet(frist, new Date(frist))).toBe(false);
    expect(erInnenforLesevinduet(frist, new Date("2027-01-01T00:00:00Z"))).toBe(false);
    expect(erInnenforLesevinduet(null, new Date("2026-11-01T00:00:00Z"))).toBe(false);
  });

  it("viser frist og at dokumentene bare kan leses", () => {
    render(
      <FilerTilgjengeligVarsel
        filerTilgjengeligTil={frist}
        nå={new Date("2026-11-06T09:00:00Z")}
      />,
    );

    expect(screen.getByRole("heading", { name: "Saken er avsluttet" })).toBeDefined();
    expect(screen.getByText(/fram til 3\. desember 2026 kl\. 10:00/)).toBeDefined();
    expect(screen.getByText(/Du kan ikke endre eller kommentere dem\./)).toBeDefined();
  });

  it("vises ikke etter fristen eller uten frist", () => {
    const { container, rerender } = render(
      <FilerTilgjengeligVarsel filerTilgjengeligTil={frist} nå={new Date(frist)} />,
    );
    expect(container.innerHTML).toBe("");

    rerender(<FilerTilgjengeligVarsel filerTilgjengeligTil={null} />);
    expect(container.innerHTML).toBe("");
  });
});
