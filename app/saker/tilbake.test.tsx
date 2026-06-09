import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { useTilbakeLenke, type Tilbakemål } from "./tilbake";

function Visning({ standard }: { standard: Tilbakemål }) {
  const tilbake = useTilbakeLenke(standard);
  return <span data-testid="resultat">{`${tilbake.label}|${tilbake.to}`}</span>;
}

function renderMedState(state: unknown) {
  const Stub = createRoutesStub([
    {
      path: "/saker/:sakId",
      Component: () => <Visning standard={{ to: "/mine-saker", label: "Mine saker" }} />,
    },
  ]);
  return render(<Stub initialEntries={[{ pathname: "/saker/ABC-123", state }]} />);
}

describe("useTilbakeLenke", () => {
  it("bruker opphavet fra location.state når det finnes", () => {
    renderMedState({ tilbake: { to: "/alle-saker", label: "Alle saker" } });

    expect(screen.getByTestId("resultat").textContent).toBe("Alle saker|/alle-saker");
  });

  it("faller tilbake til standard når state mangler", () => {
    renderMedState(undefined);

    expect(screen.getByTestId("resultat").textContent).toBe("Mine saker|/mine-saker");
  });

  it("faller tilbake til standard når state har feil form", () => {
    renderMedState({ tilbake: { to: 42 } });

    expect(screen.getByTestId("resultat").textContent).toBe("Mine saker|/mine-saker");
  });
});
