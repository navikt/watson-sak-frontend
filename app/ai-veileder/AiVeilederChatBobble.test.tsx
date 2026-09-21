import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { describe, expect, it } from "vitest";
import { RouteConfig } from "~/routeConfig";
import { AiVeilederChatBobble } from "./AiVeilederChatBobble";

function renderMedFlaggOgAction(
  påskrudd: boolean,
  actionRespons: () => Response = () =>
    Response.json({
      data: {
        reply: "Trykk på Mine saker i menyen.",
        timestamp: "2026-01-01T10:00:00Z",
        escalateSuggested: false,
        guard: "ALLOWED",
      },
    }),
) {
  const Stub = createRoutesStub([
    {
      id: "root",
      path: "/",
      loader: () => ({ featureFlagg: { "watson-sak-ai-veileder": påskrudd } }),
      Component: () => <AiVeilederChatBobble />,
    },
    {
      path: RouteConfig.API.AI_VEILEDER_MELDING,
      action: actionRespons,
    },
  ]);
  return render(<Stub initialEntries={["/"]} />);
}

describe("AiVeilederChatBobble", () => {
  it("vises ikke når feature-flagget er avskrudd", async () => {
    renderMedFlaggOgAction(false);

    await waitFor(() => {
      expect(screen.queryByLabelText("Åpne AI-veileder")).toBeNull();
    });
  });

  it("åpner panelet og sender melding til ressursruten", async () => {
    renderMedFlaggOgAction(true);

    fireEvent.click(await screen.findByLabelText("Åpne AI-veileder"));
    const felt = screen.getByLabelText("Skriv en melding");
    fireEvent.change(felt, { target: { value: "Hvor er mine saker?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    const svar = await screen.findByTestId("ai-veileder-svar");
    expect(svar.textContent).toContain("Trykk på Mine saker i menyen.");
  });

  it("viser eskaleringshint når escalateSuggested er true", async () => {
    renderMedFlaggOgAction(true, () =>
      Response.json({
        data: {
          reply: "Jeg er usikker på dette.",
          timestamp: "2026-01-01T10:00:00Z",
          escalateSuggested: true,
          guard: "ALLOWED",
        },
      }),
    );

    fireEvent.click(await screen.findByLabelText("Åpne AI-veileder"));
    fireEvent.change(screen.getByLabelText("Skriv en melding"), {
      target: { value: "Noe uklart" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    const hint = await screen.findByText(/Ta kontakt med en kollega eller support/);
    expect(hint.textContent).toContain("Ta kontakt med en kollega eller support");
  });
});
